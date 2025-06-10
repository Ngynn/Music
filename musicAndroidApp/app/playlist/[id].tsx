import React, { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  ActionSheetIOS,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useAudio } from "../context/audioContext";
import { COLORS, SIZES } from "../constants/theme";
import ModalPlayer from "../components/modalPlayer";
import MiniPlayer from "../components/miniPlayer";
import { useAlert } from "../context/alertContext"; 
import MenuOptions from "../context/menuOptions";

const { width } = Dimensions.get("window");

interface PlaylistSong {
  id: string;
  songId: string;
  playlistId: string;
  addedAt: Date;
  song?: Song;
  name?: string;
}

interface Song {
  id: string;
  name: string;
  artist: string;
  album?: string;
  duration: number;
  img: string;
  audio: string;
  likes?: number;
  views?: number;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImg: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export default function PlaylistDetails() {
  const { showAlert, confirm, success, error } = useAlert();
  const { id } = useLocalSearchParams();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);
  const [menuOptionsVisible, setMenuOptionsVisible] = useState(false);
  const [selectedSongForMenu, setSelectedSongForMenu] = useState<{
    id: string;
    name: string;
    artist: string;
    image: string;
  } | null>(null);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    playSound,
    currentSong,
    likedSongs,
    currentlyPlaying,
    setCurrentSongList,
    isPlaying,
    pauseOrResume,
    toggleRepeat,
    isRepeat,
    currentPosition,
    duration,
    showPlayer,
    setShowPlayer,
    handleLike,
    isLiked,
    playPrevious,
    playNext,
    seekToPosition,
    togglePlaybackMode,
    playbackMode,
    autoPlayEnabled,
    currentSongId,
    isCurrentlyPlayingSong,
  } = useAudio();

  // chuyen doi số thành định dạng dễ đọc
  const formatNumber = (num: number): string => {
    if (!num && num !== 0) return "0";

    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B"; // 1 ty = 1B
    } else if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"; // 1 trieu = 1M
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K"; // 1 nghin = 1K
    } else {
      return num.toString();
    }
  };

  // lay bai hat theo playlistId 
  const fetchPlaylistSongs = useCallback(
    async (playlistId: string) => {
      try {
        const q = query(
          collection(db, "playlistSongs"),
          where("playlistId", "==", playlistId)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setSongs([]);
          return;
        }

        // Sử dụng Promise.all để fetch song data song song
        const songPromises = querySnapshot.docs.map(async (playlistSongDoc) => {
          const docData = playlistSongDoc.data();
          if (docData) {
            const playlistSong = {
              id: playlistSongDoc.id,
              ...docData,
            } as PlaylistSong;

            const songDoc = await getDoc(doc(db, "song", playlistSong.songId));
            if (songDoc.exists()) {
              playlistSong.song = {
                id: songDoc.id,
                ...songDoc.data(),
              } as Song;

              return playlistSong;
            }
          }
          return null;
        });

        const results = await Promise.all(songPromises);
        const validSongs = results.filter(
          (song) => song !== null
        ) as PlaylistSong[];

        setSongs(validSongs);
      } catch (err) {
        console.error("Error fetching playlist songs:", err);
        error("Lỗi", "Không thể tải danh sách bài hát"); 
      }
    },
    [error]
  ); // Thêm error vào dependencies

  // lay ds bai hat yeu thich 
  const fetchFavoriteSongs = useCallback(async () => {
    if (!likedSongs || likedSongs.size === 0) {
      setSongs([]);
      return;
    }

    try {
      const favoriteSongsArray: PlaylistSong[] = [];

      // Sử dụng Promise.all để fetch song data song song thay vì tuần tự
      const songPromises = Array.from(likedSongs).map(async (songId) => {
        const songDoc = await getDoc(doc(db, "song", songId));
        if (songDoc.exists()) {
          return {
            id: `fav_${songId}`,
            songId,
            playlistId: "_favPlaylist",
            addedAt: new Date(),
            song: {
              id: songDoc.id,
              ...songDoc.data(),
            } as Song,
          };
        }
        return null;
      });

      const results = await Promise.all(songPromises);

      // Lọc bỏ các kết quả null
      const validSongs = results.filter(
        (song) => song !== null
      ) as PlaylistSong[];

      setSongs(validSongs);
    } catch (err) {
      console.error("Error fetching favorite songs:", err);
      error("Lỗi", "Không thể tải danh sách bài hát yêu thích"); 
    }
  }, [likedSongs, error]); // Thêm error vào dependencies

  // 
  const removeSongFromPlaylist = useCallback(
    async (playlistSongId: string) => {
      try {
        if (id === "_favPlaylist") {
          const songId = playlistSongId.replace("fav_", "");

          // Sử dụng handleLike để unlike bài hát
          await handleLike(songId);

          success("Thành công", "Đã xóa bài hát khỏi danh sách yêu thích"); 
          setSongs((prevSongs) =>
            prevSongs.filter((s) => s.id !== playlistSongId)
          );
          return;
        }

        await deleteDoc(doc(db, "playlistSongs", playlistSongId));

        // Cập nhật playlist song count
        const playlistRef = doc(db, "playlists", id as string);
        const playlistDoc = await getDoc(playlistRef);

        if (playlistDoc.exists()) {
          const currentSongCount = playlistDoc.data().songCount || 0;
          await updateDoc(playlistRef, {
            songCount: Math.max(0, currentSongCount - 1),
            updatedAt: serverTimestamp(),
          });
        }

        setSongs((prevSongs) =>
          prevSongs.filter((s) => s.id !== playlistSongId)
        );
        success("Thành công", "Đã xóa bài hát khỏi playlist"); 
      } catch (err) {
        console.error("Error removing song from playlist:", err);
        error("Lỗi", "Không thể xóa bài hát khỏi playlist"); 
      }
    },
    [id, handleLike, success, error]
  ); // Thêm success, error vào dependencies

  // mo menu options
  const openMenuOptions = useCallback((song: Song) => {
    setSelectedSongForMenu({
      id: song.id,
      name: song.name,
      artist: song.artist,
      image: song.img,
    });
    setMenuOptionsVisible(true);
  }, []);

  // đóng menu options
  const closeMenuOptions = useCallback(() => {
    setMenuOptionsVisible(false);
    setSelectedSongForMenu(null);
  }, []);

  // xoa bai hat
  const confirmRemoveSong = useCallback(
    (playlistSongId: string) => {
      const songToRemove = songs.find((s) => s.id === playlistSongId);
      const songName = songToRemove?.song?.name || "bài hát này";

      confirm(
        "Xác nhận xóa",
        `Bạn có chắc muốn xóa "${songName}" khỏi ${
          id === "_favPlaylist" ? "danh sách yêu thích" : "playlist"
        }?`,
        () => {
          removeSongFromPlaylist(playlistSongId);
        },
        () => {
          console.log("User cancelled remove song");
        }
      );
    },
    [songs, id, confirm, removeSongFromPlaylist]
  );

  // hien thi menu bai hat
  const showSongMenu = useCallback(
    (playlistSong: PlaylistSong) => {
      if (!playlistSong.song) return;

      if (Platform.OS === "ios") {
        const options = [
          "Hủy",
          "Thêm vào playlist khác",
          likedSongs.has(playlistSong.song.id) ? "Bỏ thích" : "Yêu thích",
          "Xóa khỏi playlist",
        ];
        const cancelButtonIndex = 0;
        const deleteButtonIndex = 3;

        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
            destructiveButtonIndex: deleteButtonIndex,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              openMenuOptions(playlistSong.song!);
            } else if (buttonIndex === 2) {
              handleLike(playlistSong.song!.id);
            } else if (buttonIndex === deleteButtonIndex) {
              confirmRemoveSong(playlistSong.id);
            }
          }
        );
      } else {
        openMenuOptions(playlistSong.song!);
      }
    },
    [likedSongs, openMenuOptions, handleLike, confirmRemoveSong]
  );

  // phat tat ca bai hat trong playlist
  const playAll = useCallback(() => {
    if (songs.length === 0) {
      showAlert("Thông báo", "Playlist không có bài hát nào để phát");
      return;
    }

    try {
      const songObjects = songs
        .filter((item) => item.song !== undefined)
        .map((item) => item.song!);

      setCurrentSongList(songObjects);

      if (songObjects.length > 0) {
        playSound(songObjects, 0);
      } else {
        showAlert("Thông báo", "Không có bài hát hợp lệ để phát");
      }
    } catch (err) {
      console.error("Error playing all songs:", err);
      error("Lỗi", "Không thể phát nhạc. Vui lòng thử lại.");
    }
  }, [songs, setCurrentSongList, playSound, showAlert, error]);

  // refresh ds bai hat
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (id === "_favPlaylist") {
        await fetchFavoriteSongs();
      } else {
        await fetchPlaylistSongs(id as string);
      }
    } catch (err) {
      console.error("Error refreshing:", err);
      error("Lỗi", "Không thể làm mới danh sách. Vui lòng thử lại.");
    } finally {
      setRefreshing(false);
    }
  }, [id, fetchFavoriteSongs, fetchPlaylistSongs, error]);

  // focus effect de lay chi tiet playlist
  useFocusEffect(
    useCallback(() => {
      const fetchPlaylistDetails = async () => {
        try {
          setLoading(true);

          if (id === "_favPlaylist") {
            setPlaylist({
              id: "_favPlaylist",
              name: "Bài hát yêu thích",
              description: "Những bài hát bạn đã thích",
              coverImg: "https://example.com/favorites-cover.jpg",
              userId: "",
              createdAt: null,
              updatedAt: null,
            });
            await fetchFavoriteSongs();
            return;
          }

          const playlistDoc = await getDoc(doc(db, "playlists", id as string));

          if (!playlistDoc.exists()) {
            error("Lỗi", "Không tìm thấy playlist");
            router.back();
            return;
          }

          setPlaylist({
            id: playlistDoc.id,
            ...playlistDoc.data(),
          } as Playlist);

          await fetchPlaylistSongs(id as string);
        } catch (err) {
          console.error("Error fetching playlist details:", err);
          error("Lỗi", "Không thể tải thông tin playlist");
        } finally {
          setLoading(false);
        }
      };

      fetchPlaylistDetails();
    }, [id, likedSongs, error, router])
  );

  // render item bai hat trong playlist
  const renderSongItem = ({
    item,
    index,
  }: {
    item: PlaylistSong;
    index: number;
  }) => (
    <TouchableOpacity
      style={[
        styles.songItem,
        item.song && isCurrentlyPlayingSong(item.song.id) && styles.playingItem, 
      ]}
      onPress={() => {
        if (item.song) {
          const songObjects = songs
            .filter((s) => s.song !== undefined)
            .map((s) => s.song!);

          const selectedIndex = songObjects.findIndex(
            (s) => s && s.id === item.song?.id
          );

          if (selectedIndex !== -1) {
            setCurrentSongList(songObjects);
            playSound(songObjects, selectedIndex);
          }
        }
      }}
    >
      <Text style={styles.songIndex}>{index + 1}</Text>
      <Image
        source={{
          uri: item.song?.img || "https://example.com/default-cover.jpg",
        }}
        style={styles.songCover}
      />
      <View style={styles.songDetails}>
        <Text
          style={[
            styles.songTitle,
            item.song &&
              isCurrentlyPlayingSong(item.song.id) &&
              styles.currentSongText,
          ]}
        >
          {item.song?.name}
        </Text>
        <Text style={styles.artistName}>{item.song?.artist}</Text>

        <View style={styles.statsRow}>
          <Icon name="favorite" size={14} color={COLORS.primary} />
          <Text style={styles.statText}>
            {formatNumber(item.song?.likes || 0)}
          </Text>
          <Icon
            name="visibility"
            size={14}
            color={COLORS.textSecondary}
            style={{ marginLeft: 10 }}
          />
          <Text style={styles.statText}>
            {formatNumber(item.song?.views || 0)}
          </Text>
        </View>
      </View>

      <View style={styles.songActions}>
        {/* Like Button */}
        <TouchableOpacity
          style={styles.actionIcon}
          onPress={async (e) => {
            e.stopPropagation();
            if (item.song) {
              try {
                await handleLike(item.song.id);
              } catch (err) {
                console.error("Error liking song:", err);
                error("Lỗi", "Không thể cập nhật trạng thái yêu thích");
              }
            }
          }}
        >
          <Icon
            name={
              item.song && isLiked(item.song.id)
                ? "favorite"
                : "favorite-border"
            }
            size={24}
            color={
              item.song && isLiked(item.song.id)
                ? COLORS.primary
                : COLORS.textSecondary
            }
          />
        </TouchableOpacity>

        {/* Menu Button */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={(e) => {
            e.stopPropagation();
            showSongMenu(item);
          }}
        >
          <Icon name="more-vert" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // neu dang loading => hien thi loading spinner
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          backgroundColor={COLORS.background}
          barStyle="dark-content"
          translucent={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ko có playlist thi hien thi error
  if (!playlist) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          backgroundColor={COLORS.background}
          barStyle="dark-content"
          translucent={true}
        />
        <View style={styles.container}>
          <Text style={styles.errorText}>Không tìm thấy playlist</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={COLORS.background}
        barStyle="dark-content"
        translucent={true}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Icon name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết Playlist</Text>
        </View>

        <View style={styles.playlistHeader}>
          <Image
            source={{
              uri:
                playlist.coverImg || "https://example.com/default-playlist.jpg",
            }}
            style={styles.coverImage}
          />
          <View style={styles.playlistInfo}>
            <Text style={styles.playlistName}>{playlist.name}</Text>
            {playlist.description && (
              <Text style={styles.playlistDescription}>
                {playlist.description}
              </Text>
            )}
            <Text style={styles.songCount}>{songs.length} bài hát</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.playAllButton}
            onPress={playAll}
            disabled={songs.length === 0}
          >
            <Icon name="play-arrow" size={24} color={COLORS.background} />
            <Text style={styles.playAllText}>Phát tất cả</Text>
          </TouchableOpacity>

          {id !== "_favPlaylist" && (
            <TouchableOpacity
              style={styles.addSongsButton}
              onPress={() =>
                router.push({
                  pathname: "/crud/addSongsPlaylist",
                  params: { playlistId: id as string },
                })
              }
            >
              <Icon name="add" size={24} color={COLORS.text} />
              <Text style={styles.addSongsText}>Thêm bài hát</Text>
            </TouchableOpacity>
          )}
        </View>

        {songs.length === 0 ? (
          <View style={styles.emptySongs}>
            <Icon name="music-off" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Playlist này chưa có bài hát</Text>
          </View>
        ) : (
          <FlatList
            data={songs}
            keyExtractor={(item) => item.id}
            renderItem={renderSongItem}
            contentContainerStyle={{
              paddingBottom: miniPlayerHeight || 0,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        )}

        {/* Existing Options Modal - CÓ THỂ GIỮ LẠI HOẶC XÓA */}
        {/* {renderOptionsModal()} */}

        {/* ✅ MENUOPTIONS COMPONENT - CHÍNH */}
        <MenuOptions
          visible={menuOptionsVisible}
          onClose={closeMenuOptions}
          songId={selectedSongForMenu?.id || ""}
          songName={selectedSongForMenu?.name || ""}
          songArtist={selectedSongForMenu?.artist || ""}
          songImage={selectedSongForMenu?.image || ""}
        />

        {/* Modal Player */}
        <ModalPlayer
          visible={showPlayer}
          currentSong={currentSong}
          isPlaying={isPlaying}
          duration={duration}
          currentPosition={currentPosition}
          isRepeat={isRepeat}
          playbackMode={playbackMode}
          onClose={() => setShowPlayer(false)}
          onPlayPause={pauseOrResume}
          onNext={playNext}
          onPrevious={playPrevious}
          onSeek={seekToPosition}
          onToggleRepeat={toggleRepeat}
          onTogglePlaybackMode={togglePlaybackMode}
          onLike={() => currentSong && handleLike(currentSong.id)}
          isLiked={currentSong ? isLiked(currentSong.id) : false}
        />

        {/* Mini Player */}
        {currentlyPlaying !== -1 && currentSong && !showPlayer && (
          <MiniPlayer
            currentSong={
              currentSong || {
                name: "Chưa có bài hát",
                artist: "Unknown",
                img: "https://via.placeholder.com/150",
              }
            }
            isPlaying={isPlaying}
            onPlayPause={pauseOrResume}
            onOpen={() => setShowPlayer(true)}
            duration={duration}
            currentPosition={currentPosition}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setMiniPlayerHeight(height);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.hoverBg,
  },
  headerTitle: {
    flex: 1,
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginRight: 40,
  },
  playlistHeader: {
    flexDirection: "row",
    padding: SIZES.md,
    alignItems: "center",
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  playlistInfo: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  playlistName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "bold",
  },
  playlistDescription: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  songCount: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    marginTop: 8,
    fontWeight: "500",
  },
  controls: {
    flexDirection: "row",
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hoverBg,
  },
  playAllButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 20,
    alignItems: "center",
    marginRight: SIZES.sm,
  },
  playAllText: {
    color: COLORS.background,
    fontWeight: "bold",
    marginLeft: 4,
  },
  addSongsButton: {
    flexDirection: "row",
    backgroundColor: COLORS.hoverBg,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 20,
    alignItems: "center",
  },
  addSongsText: {
    color: COLORS.text,
    fontWeight: "bold",
    marginLeft: 4,
  },
  emptySongs: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: "center",
    marginTop: SIZES.md,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    marginBottom: 10,

    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
  },
  playingItem: {
    backgroundColor: COLORS.cardBgHighlight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  songIndex: {
    color: COLORS.textSecondary,
    width: 25,
    textAlign: "center",
    marginRight: 4,
  },
  songCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: SIZES.sm,
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    color: COLORS.text,
    fontSize: SIZES.md,
    fontWeight: "500",
  },
  currentSongText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  artistName: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  songActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIcon: {
    padding: 8,
  },
  menuButton: {
    padding: 4,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    padding: 8,
  },
  errorText: {
    color: COLORS.text,
    fontSize: SIZES.md,
    textAlign: "center",
    marginTop: SIZES.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  optionsContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SIZES.md,
  },
  songInfoInModal: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hoverBg,
  },
  modalSongImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: SIZES.md,
  },
  modalSongName: {
    fontSize: SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
  modalSongArtist: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.md,
  },
  optionText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginLeft: SIZES.md,
  },
});
