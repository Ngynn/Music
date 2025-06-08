import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  SafeAreaView, // Thêm SafeAreaView
  StatusBar, // Thêm StatusBar
  Platform, // Thêm Platform
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAudio } from "../context/audioContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";
import ModalPlayer from "../components/modalPlayer";
import MiniPlayer from "../components/miniPlayer";
import { COLORS, SIZES } from "../constants/theme";

const { width } = Dimensions.get("window");

interface Song {
  id: string;
  name: string;
  artist: string;
  album?: string;
  img: string;
  audio: string;
  likes?: number;
  views?: number;
}

export default function Favorites() {
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);

  const {
    playSound,
    pauseOrResume,
    isPlaying,
    currentSong,
    currentlyPlaying,
    showPlayer,
    setShowPlayer,
    handleLike,
    isLiked,
    likedSongs,
    toggleRepeat,
    isRepeat,
    currentPosition,
    duration,
    playNext,
    playPrevious,
    seekToPosition,
    setCurrentlyPlaying,
    setCurrentSongList,
    togglePlaybackMode,
    playbackMode,
    currentSongId,
    isCurrentlyPlayingSong,
  } = useAudio();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  const formatNumber = (num: number): string => {
    if (!num && num !== 0) return "0";

    if (num >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    } else if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    } else if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    } else {
      return num.toString();
    }
  };

  useEffect(() => {
    const fetchFavoriteSongs = async () => {
      if (!isLoggedIn || likedSongs.size === 0) {
        setFavoriteSongs([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const songPromises = Array.from(likedSongs).map(async (songId) => {
          const songDoc = await getDoc(doc(db, "song", songId));
          if (songDoc.exists()) {
            return { id: songDoc.id, ...songDoc.data() } as Song;
          }
          return null;
        });

        const songs = (await Promise.all(songPromises)).filter(
          (song) => song !== null
        ) as Song[];
        setFavoriteSongs(songs);
      } catch (error) {
        console.error("Error fetching favorite songs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteSongs();
  }, [likedSongs, isLoggedIn]);

  // if (!isLoggedIn) {
  //   return (
  //     <View style={styles.container}>
  //       <View style={styles.messageContainer}>
  //         <Icon name="account-circle" size={80} color={COLORS.textSecondary} />
  //         <Text style={styles.messageTitle}>
  //           Đăng nhập để xem bài hát yêu thích
  //         </Text>
  //         <Text style={styles.messageText}>
  //           Hãy đăng nhập để lưu và xem danh sách bài hát yêu thích của bạn.
  //         </Text>
  //       </View>
  //     </View>
  //   );
  // }

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
            onPress={() => router.replace("/(tabs)/playlists")}
          >
            <Icon name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Bài hát yêu thích</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : favoriteSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="favorite-border"
              size={80}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyText}>
              Bạn chưa thích bài hát nào. Hãy thích một số bài hát để xem ở đây.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.playAllContainer}>
              <TouchableOpacity
                style={styles.playAllButton}
                onPress={() => {
                  if (favoriteSongs.length > 0) {
                    setCurrentSongList(favoriteSongs);
                    setCurrentlyPlaying(0);
                    playSound(favoriteSongs, 0);
                  }
                }}
              >
                <Icon name="play-arrow" size={24} color={COLORS.background} />
                <Text style={styles.playAllText}>Phát tất cả</Text>
              </TouchableOpacity>
              <Text style={styles.songCount}>
                {favoriteSongs.length} bài hát
              </Text>
            </View>

            <FlatList
              data={favoriteSongs}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.songItem,
                    isCurrentlyPlayingSong(item.id) && styles.playingItem,
                  ]}
                  onPress={() => {
                    setCurrentSongList(favoriteSongs);
                    setCurrentlyPlaying(index);
                    playSound(favoriteSongs, index);
                  }}
                >
                  <Image source={{ uri: item.img }} style={styles.songImage} />
                  <View style={styles.songDetails}>
                    <Text
                      style={[
                        styles.songName,
                        isCurrentlyPlayingSong(item.id) &&
                          styles.currentSongText,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.songArtist}>{item.artist}</Text>

                    <View style={styles.statsRow}>
                      <Icon name="favorite" size={14} color={COLORS.primary} />
                      <Text style={styles.statText}>
                        {formatNumber(item.likes || 0)}
                      </Text>
                      <Icon
                        name="visibility"
                        size={14}
                        color={COLORS.textSecondary}
                        style={{ marginLeft: 10 }}
                      />
                      <Text style={styles.statText}>
                        {formatNumber(item.views || 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.songActions}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleLike(item.id);
                      }}
                      style={styles.likeButton}
                    >
                      <Icon
                        name={isLiked(item.id) ? "favorite" : "favorite-border"}
                        size={24}
                        color={
                          isLiked(item.id)
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />
                    </TouchableOpacity>

                    {isCurrentlyPlayingSong(item.id) && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          pauseOrResume();
                        }}
                        style={styles.playPauseButton}
                      >
                        <Icon
                          name={isPlaying ? "pause" : "play-arrow"}
                          size={24}
                          color={COLORS.text}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={{
                paddingBottom: miniPlayerHeight || 0,
              }}
            />
          </>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.hoverBg,
    marginRight: SIZES.sm,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: SIZES.md,
    marginTop: SIZES.lg,
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.xl,
  },
  messageTitle: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  messageText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: SIZES.md,
  },
  playAllContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    marginBottom: SIZES.md,
  },
  playAllButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 20,
    alignItems: "center",
  },
  playAllText: {
    color: COLORS.background,
    fontWeight: "bold",
    marginLeft: 4,
  },
  songCount: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.sm,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.xs,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
  },
  playingItem: {
    backgroundColor: COLORS.cardBgHighlight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  songImage: {
    width: 55,
    height: 55,
    borderRadius: 8,
    marginRight: SIZES.sm,
  },
  songDetails: {
    flex: 1,
  },
  songName: {
    fontSize: SIZES.md,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 2,
  },
  currentSongText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  songArtist: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  songAlbum: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
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
  likeButton: {
    padding: 8,
  },
  playPauseButton: {
    padding: 8,
    backgroundColor: COLORS.hoverBg,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
