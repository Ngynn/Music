import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useAudio } from "../context/audioContext";
import { db } from "../../firebaseConfig";
import { useFocusEffect } from "@react-navigation/native";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import ModalPlayer from "../components/modalPlayer";
import MiniPlayer from "../components/miniPlayer";
import MenuOptions from "../context/menuOptions";
import { COLORS, SIZES } from "../constants/theme";
import { useRouter } from "expo-router";
import { Dimensions } from "react-native";
import { useAlert } from "../context/alertContext";

const { width } = Dimensions.get("window");

// Thêm format number function để định dạng số
const formatNumber = (num: number): string => {
  if (!num && num !== 0) return "0";
  if (num >= 1_000_000)
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
};

interface Song {
  name: string;
  artist: string;
  img: string;
  audio: string;
  likes?: number;
  views?: number;
  album?: string;
  duration?: number;
  [key: string]: any; // For any additional fields
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [sortedSongs, setSortedSongs] = useState<Song[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<string>("name_asc"); // Mặc định A-Z
  const [loading, setLoading] = useState(true);
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);
  const [showSongOptions, setShowSongOptions] = useState<string | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [showMenuOptions, setShowMenuOptions] = useState(false);
  const [selectedSongForMenu, setSelectedSongForMenu] = useState<any>(null);

  // ham sort mặc định theo tên A-Z
  const [sortDirections, setSortDirections] = useState({
    name: "asc" as "asc" | "desc",
    artist: "asc" as "asc" | "desc",
    views: "desc" as "asc" | "desc", // Views mặc định từ cao xuống thấp
  });

  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const { prompt, confirm, success, error } = useAlert();

  const {
    playSound,
    pauseOrResume,
    toggleRepeat,
    isPlaying,
    isRepeat,
    currentSong,
    currentPosition,
    duration,
    currentlyPlaying,
    showPlayer,
    setShowPlayer,
    handleLike,
    isLiked,
    playNext,
    playPrevious,
    seekToPosition,
    setCurrentlyPlaying,
    setCurrentSongList,
    playbackMode,
    togglePlaybackMode,
    currentSongId,
    isCurrentlyPlayingSong,
  } = useAudio();

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "song"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Song),
      }));

      // sap xep theo ten bai hat A-Z
      const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));

      setSongs(data);
      setSortedSongs(sortedData);
      setCurrentSongList(sortedData);
    } catch (error) {
      console.error("Lỗi khi lấy bài hát từ Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách playlist của người dùng
  const fetchUserPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        console.error("Không có người dùng đăng nhập");
        setLoadingPlaylists(false);
        return;
      }

      const q = query(
        collection(db, "playlists"),
        where("userId", "==", userId)
      );

      const querySnapshot = await getDocs(q);
      const playlists = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUserPlaylists(playlists);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách playlist:", error);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Kiểm tra bài hát có trong playlist không
  const checkIfSongInPlaylist = (songId: string, playlistId: string) => {
    // Tìm playlist theo id
    const playlist = userPlaylists.find((p) => p.id === playlistId);

    // Nếu playlist không tồn tại hoặc không có songs array
    if (!playlist || !playlist.songs) return false;

    // Kiểm tra songId có trong danh sách songs không
    return playlist.songs.some((song: any) => song.id === songId);
  };

  // Thêm bài hát vào playlist
  const handleAddToPlaylist = async (playlistId: string, songId: string) => {
    try {
      // Lấy thông tin bài hát để thêm vào playlist
      const songRef = doc(db, "song", songId);
      const songDoc = await getDoc(songRef);

      if (!songDoc.exists()) {
        console.error("Bài hát không tồn tại");
        return;
      }

      const songData = songDoc.data();
      const songToAdd = {
        id: songId,
        name: songData.name,
        artist: songData.artist,
        img: songData.img,
        audio: songData.audio,
        // Thêm các trường khác nếu cần
      };

      // Lấy thông tin playlist hiện tại
      const playlistRef = doc(db, "playlists", playlistId);
      const playlistDoc = await getDoc(playlistRef);

      if (!playlistDoc.exists()) {
        console.error("Playlist không tồn tại");
        return;
      }

      const playlistData = playlistDoc.data();
      const currentSongs = playlistData.songs || [];

      // Kiểm tra xem bài hát đã có trong playlist chưa
      const songExists = currentSongs.some((song: any) => song.id === songId);

      if (songExists) {
        console.log("Bài hát đã có trong playlist");
        return;
      }

      // Thêm bài hát vào playlist
      await updateDoc(playlistRef, {
        songs: [...currentSongs, songToAdd],
        updatedAt: serverTimestamp(),
      });

      // Cập nhật state để UI hiển thị ngay
      setUserPlaylists((prev) => {
        return prev.map((p) => {
          if (p.id === playlistId) {
            return {
              ...p,
              songs: [...(p.songs || []), songToAdd],
            };
          }
          return p;
        });
      });

      // Thay Alert.alert bằng success
      success("Thành công", "Đã thêm bài hát vào playlist");
    } catch (err) {
      console.error("Lỗi khi thêm bài hát vào playlist:", err);
      // Thay Alert.alert bằng error
      error("Lỗi", "Không thể thêm bài hát vào playlist");
    }
  };

  // Xóa bài hát khỏi playlist
  const handleRemoveFromPlaylist = async (
    playlistId: string,
    songId: string
  ) => {
    try {
      // Lấy thông tin playlist hiện tại
      const playlistRef = doc(db, "playlists", playlistId);
      const playlistDoc = await getDoc(playlistRef);

      if (!playlistDoc.exists()) {
        console.error("Playlist không tồn tại");
        return;
      }

      const playlistData = playlistDoc.data();
      const currentSongs = playlistData.songs || [];

      // Lọc bỏ bài hát cần xóa
      const updatedSongs = currentSongs.filter(
        (song: any) => song.id !== songId
      );

      // Cập nhật playlist trong Firestore
      await updateDoc(playlistRef, {
        songs: updatedSongs,
        updatedAt: serverTimestamp(),
      });

      // Cập nhật state để UI hiển thị ngay
      setUserPlaylists((prev) => {
        return prev.map((p) => {
          if (p.id === playlistId) {
            return {
              ...p,
              songs: (p.songs || []).filter((song: any) => song.id !== songId),
            };
          }
          return p;
        });
      });

      // Thay Alert.alert bằng success
      success("Thành công", "Đã xóa bài hát khỏi playlist");
    } catch (err) {
      console.error("Lỗi khi xóa bài hát khỏi playlist:", err);
      // Thay Alert.alert bằng error
      error("Lỗi", "Không thể xóa bài hát khỏi playlist");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true); // Bắt đầu refreshing
    try {
      await fetchSongs(); // Gọi API lấy dữ liệu

      // Nếu cần fetch thêm dữ liệu khác
      await fetchUserPlaylists();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false); // Kết thúc refreshing dù có lỗi hay không
    }
  };

  // ham sỏrt bài hát theo tên, nghệ sĩ hoặc lượt xem
  const sortSongs = (type: string) => {
    let sorted = [...songs];
    let newDirection: "asc" | "desc"; // biến mới để lưu hướng sắp xếp

    if (type === "name") {
      // loc theo ten bai hat
      newDirection = sortDirections.name === "asc" ? "desc" : "asc";
      if (newDirection === "asc") {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        sorted.sort((a, b) => b.name.localeCompare(a.name));
      }
      setSortDirections((prev) => ({ ...prev, name: newDirection }));
    } 
    
    else if (type === "artist") {
      // loc theo ten artist
      newDirection = sortDirections.artist === "asc" ? "desc" : "asc";
      if (newDirection === "asc") {
        sorted.sort((a, b) => a.artist.localeCompare(b.artist));
      } else {
        sorted.sort((a, b) => b.artist.localeCompare(a.artist));
      }
      setSortDirections((prev) => ({ ...prev, artist: newDirection }));
    } 
    
    else if (type === "views") {
      // loc theo so luong view 
      newDirection = sortDirections.views === "desc" ? "asc" : "desc";
      if (newDirection === "desc") {
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      } else {
        sorted.sort((a, b) => (a.views || 0) - (b.views || 0));
      }
      setSortDirections((prev) => ({ ...prev, views: newDirection }));
    } 
    
    else {
      console.warn(`Unknown sort type: ${type}`);
      return; 
    }

    setSortedSongs(sorted);
    setSortOption(`${type}_${newDirection}`);
    setCurrentSongList(sorted);

    // ✅ THÔNG BÁO NGẮN GỌN
    const getDirectionText = (dir: "asc" | "desc") =>
      dir === "asc" ? "A→Z" : "Z→A";
    const getViewsDirectionText = (dir: "asc" | "desc") =>
      dir === "desc" ? "Cao→Thấp" : "Thấp→Cao";

    const messages: { [key: string]: string } = {
      name: `Tên ${getDirectionText(newDirection)}`,
      artist: `Nghệ sĩ ${getDirectionText(newDirection)}`,
      views: `Lượt xem ${getViewsDirectionText(newDirection)}`,
    };

    success("Đã sắp xếp", messages[type] || "Đã sắp xếp");
  };

  // ham hien thi cac option 
  const showSortOptions = () => {
    const getNextDirection = (type: string, current: string) => {
      if (type === "views") {
        return current === "desc" ? "asc" : "desc";
      }
      return current === "asc" ? "desc" : "asc";
    };

    // lay bieu tuong len xuong tuong trung cho sap xep theo luot xem
    const getDirectionIcon = (type: string, direction: string) => {
      if (type === "views") {
        return direction === "desc" ? "↓" : "↑";
      }
      return direction === "asc" ? "↑" : "↓";
    };

    prompt("Sắp xếp bài hát", "Chọn cách sắp xếp:", [
      {
        text: `🎵 Tên ${getDirectionIcon(
          "name",
          getNextDirection("name", sortDirections.name)
        )}`,
        onPress: () => sortSongs("name"),
      },
      {
        text: `🎤 Nghệ sĩ ${getDirectionIcon(
          "artist",
          getNextDirection("artist", sortDirections.artist)
        )}`,
        onPress: () => sortSongs("artist"),
      },
      {
        text: `👁️ Lượt xem ${getDirectionIcon(
          "views",
          getNextDirection("views", sortDirections.views)
        )}`,
        onPress: () => sortSongs("views"),
      },
      {
        text: "❌ Hủy",
        style: "cancel",
      },
    ]);
  };

  // menu bai hat
  const showSongMenu = (songId: string) => {
    if (Platform.OS === "ios") {
      const options = ["Hủy", "Thêm vào playlist", "Yêu thích", "Chia sẻ"];
      const cancelButtonIndex = 0;
      const likeButtonIndex = 2;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex: undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            showAddToPlaylistOptions(songId);
          } else if (buttonIndex === likeButtonIndex) {
            handleLike(songId);
          } else if (buttonIndex === 3) {
            shareSong(songId);
          }
        }
      );
    } else {
      // Tìm song trong danh sách
      const song = sortedSongs.find((s) => s.id === songId);
      if (song) {
        setSelectedSongForMenu(song);
        setShowMenuOptions(true);
      }
    }
  };

  // function hien thi option add vao playlist
  const showAddToPlaylistOptions = (songId: string) => {
    if (userPlaylists.length === 0) {
      // Thay Alert.alert bằng confirm
      confirm(
        "Không có playlist",
        "Bạn chưa có playlist nào. Tạo playlist mới?",
        () => router.push("/crud/addSongsPlaylist")
      );
      return;
    }

    // Tạo mảng actions cho các playlist
    const playlistOptions = userPlaylists.map((playlist) => {
      // Kiểm tra xem bài hát đã có trong playlist chưa
      const isInPlaylist = checkIfSongInPlaylist(songId, playlist.id);

      return {
        text: `${playlist.name} ${isInPlaylist ? "✓" : ""}`,
        icon: isInPlaylist ? "playlist-add-check" : "playlist-add",
        onPress: () => {
          if (isInPlaylist) {
            // Hiển thị confirmation trước khi xóa
            confirm(
              "Xóa khỏi playlist",
              `Bạn có chắc chắn muốn xóa bài hát này khỏi playlist "${playlist.name}"?`,
              () => handleRemoveFromPlaylist(playlist.id, songId)
            );
          } else {
            // Thêm bài hát vào playlist
            handleAddToPlaylist(playlist.id, songId);
          }
        },
        // Sửa dòng này: style phải là một trong 'default', 'cancel', 'destructive' hoặc undefined
        style: isInPlaylist ? ("default" as const) : undefined,
      };
    });

    // Hiển thị prompt với các options
    prompt("Quản lý Playlist", "Thêm vào hoặc xóa khỏi playlist:", [
      ...playlistOptions,
      {
        text: "Tạo playlist mới",
        icon: "add-circle",
        onPress: () => router.push("/crud/addSongsPlaylist"),
      },
      { text: "Hủy", style: "cancel" },
    ]);
  };


  // chia se bai hat
  const shareSong = (songId: string) => {
    const song = sortedSongs.find((s) => s.id === songId);
    if (song) {
      // Thay Alert.alert bằng prompt
      prompt(
        "Chia sẻ bài hát",
        "Tính năng chia sẻ sẽ được phát triển trong tương lai.",
        [{ text: "Đóng", style: "cancel" }]
      );
    }
  };

  // ham callback de render cac bai hat trong FlatList
  const renderSongItem = React.useCallback(
    ({ item, index }: { item: Song; index: number }) => (
      <TouchableOpacity
        onPress={() => {
          if (isCurrentlyPlayingSong(item.id)) {
            setShowPlayer(false);
          } else {
            // Nếu chưa phát, phát bài hát này
            setCurrentSongList(sortedSongs);
            setCurrentlyPlaying(index);
            playSound(sortedSongs, index);
            // setShowPlayer(false);
          }
        }}
        style={[
          styles.songItem,
          isCurrentlyPlayingSong(item.id) && styles.playingItem,
        ]}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.img }} style={styles.songImage} />

        <View style={styles.songDetails}>
          <Text style={styles.songName}>{item.name}</Text>
          <Text style={styles.songArtist}>{item.artist}</Text>

          <View style={styles.statsRow}>
            {/* <Icon name="favorite" size={14} color={COLORS.primary} />
            <Text style={styles.statText}>{formatNumber(item.likes || 0)}</Text> */}
            <Icon name="visibility" size={14} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{formatNumber(item.views || 0)}</Text>
          </View>
        </View>

        <View style={styles.songActions}>
          {isCurrentlyPlayingSong(item.id) && (
            <View style={styles.nowPlaying}>
              <Icon name="equalizer" size={20} color={COLORS.primary} />
            </View>
          )}

          <TouchableOpacity
            style={styles.menuButton}
            onPress={(e) => {
              e.stopPropagation();
              showSongMenu(item.id);
            }}
          >
            <Icon name="more-vert" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [sortedSongs, isCurrentlyPlayingSong, isLiked]
  );

  useFocusEffect(
    React.useCallback(() => {
      fetchSongs();
      fetchUserPlaylists();
    }, [])
  );

  return (
    <SafeAreaProvider style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎵 Danh sách bài hát</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push("/search")}
            >
              <Icon name="search" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={showSortOptions}
            >
              <Icon name="filter-list" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : sortedSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="music-off" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Không có bài hát nào</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={sortedSongs}
            keyExtractor={(item: Song) => item.id}
            renderItem={renderSongItem}
            refreshing={refreshing}
            onRefresh={onRefresh}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: miniPlayerHeight || 0,
              gap: 8,
            }}
          />
        )}

        {selectedSongForMenu && (
          <MenuOptions
            visible={showMenuOptions}
            onClose={() => setShowMenuOptions(false)}
            songId={selectedSongForMenu.id}
            songName={selectedSongForMenu.name}
            songArtist={selectedSongForMenu.artist}
            songImage={selectedSongForMenu.img}
          />
        )}

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
    </SafeAreaProvider>
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
    padding: SIZES.md,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.md,
    paddingVertical: SIZES.xs,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.hoverBg,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: SIZES.md,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.sm,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  playingItem: {
    backgroundColor: COLORS.cardBgHighlight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: SIZES.sm,
  },
  songDetails: {
    flex: 1,
    justifyContent: "center",
  },
  songName: {
    fontSize: SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
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
  nowPlaying: {
    marginRight: 8,
  },
  menuButton: {
    padding: 4,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
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
