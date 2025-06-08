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
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAudio } from "../context/audioContext"; // Đổi từ useAudioPlayer thành useAudio
import Icon from "react-native-vector-icons/MaterialIcons";
import ModalPlayer from "../components/modalPlayer";
import MiniPlayer from "../components/miniPlayer";
import { COLORS, SIZES } from "../constants/theme";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// Thêm interface ở đầu file
interface Song {
  id: string;
  name: string;
  artist: string;
  img: string;
  likes?: number;
  views?: number;
  audio: string;
  album?: string;
}

export default function Rank() {
  const [activeTab, setActiveTab] = useState<"likes" | "views">("likes");
  const [songsByLikes, setSongsByLikes] = useState<Song[]>([]);
  const [songsByViews, setSongsByViews] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);

  // Cập nhật import từ context và thêm currentSongId, isCurrentlyPlayingSong
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
    autoPlayEnabled,
    currentSongId, // Thêm mới
    isCurrentlyPlayingSong, // Thêm mới
  } = useAudio();

  // Format number function giữ nguyên
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

  // useEffect(() => {
  //   fetchRankings();
  // }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchRankings();
      return () => {
        // Cleanup nếu cần
      };
    }, [])
  );

  const fetchRankings = async () => {
    setLoading(true);
    try {
      // Lấy bài hát theo lượt thích - Sửa lại cách truy vấn
      const likeQuery = query(
        collection(db, "song"),
        orderBy("likes", "desc"),
        limit(20)
      );
      const likeSnapshot = await getDocs(likeQuery);
      const likeData = likeSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: data.name || "Unknown",
            artist: data.artist || "Unknown Artist",
            img: data.img || "https://via.placeholder.com/150",
            likes: data.likes || 0,
          } as Song;
        })
        .filter((song) => song.likes && song.likes > 0) // Chỉ lấy những bài hát có lượt thích > 0
        .slice(0, 10); // Chỉ lấy 10 bài đầu tiên

      // console.log("Songs by likes:", likeData); // Debug để kiểm tra dữ liệu
      setSongsByLikes(likeData);

      // Tương tự với lượt xem
      const viewQuery = query(
        collection(db, "song"),
        orderBy("views", "desc"),
        limit(20)
      );
      const viewSnapshot = await getDocs(viewQuery);
      const viewData = viewSnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: data.name || "Unknown", // Đảm bảo có trường name
            artist: data.artist || "Unknown Artist", // Đảm bảo có trường artist
            img: data.img || "https://via.placeholder.com/150", // Đảm bảo có trường img
            audio: data.audio || "", // Đảm bảo có trường audio
            views: data.views || 0,
          } as Song; // Thêm as Song để ép kiểu
        })
        .filter((song) => song.views && song.views > 0)
        .slice(0, 10);

      // console.log("Songs by views:", viewData); // Debug để kiểm tra dữ liệu
      setSongsByViews(viewData);
    } catch (error) {
      console.error("Lỗi khi tải bảng xếp hạng:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); // Đảm bảo dừng refreshing dù có lỗi
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRankings();
    setRefreshing(false);
  };

  const renderSongList = () => {
    const songs = activeTab === "likes" ? songsByLikes : songsByViews;

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (songs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="music-off" size={60} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            {activeTab === "likes"
              ? "Chưa có bài hát nào nhận được lượt thích"
              : "Chưa có bài hát nào được nghe"}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.songItem,
              // Thay đổi điều kiện highlight bài hát đang phát
              isCurrentlyPlayingSong(item.id) && styles.playingItem,
            ]}
            onPress={() => {
              // Cập nhật đúng cách gọi playSound
              setCurrentSongList(songs);
              setCurrentlyPlaying(index);
              playSound(songs, index);
            }}
          >
            {/* Hiển thị thông tin */}
            <View style={styles.rankNumberContainer}>
              <Text
                style={[
                  styles.rankNumber,
                  index < 3 ? styles.topThreeRank : null,
                ]}
              >
                {index + 1}
              </Text>
            </View>

            <Image source={{ uri: item.img }} style={styles.songImage} />

            <View style={styles.songDetails}>
              <Text style={styles.songName}>{item.name || "Unknown"}</Text>
              <Text style={styles.songArtist}>
                {item.artist || "Unknown Artist"}
              </Text>

              <View style={styles.statsRow}>
                {activeTab === "likes" ? (
                  <>
                    <Icon name="favorite" size={14} color={COLORS.primary} />
                    <Text style={styles.statText}>
                      {formatNumber(item.likes || 0)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Icon
                      name="visibility"
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.statText}>
                      {formatNumber(item.views || 0)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Nút like */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleLike(item.id);
              }}
            >
              <Icon
                name={isLiked(item.id) ? "favorite" : "favorite-border"}
                size={24}
                color={isLiked(item.id) ? COLORS.primary : COLORS.textSecondary}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{
          paddingBottom: miniPlayerHeight || 0,
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={COLORS.background}
        barStyle="dark-content"
        translucent={true}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Bảng xếp hạng</Text>
        <Text style={styles.subtitle}>TOP 10 bài hát nổi bật</Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "likes" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("likes")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "likes" && styles.activeTabText,
              ]}
            >
              Theo lượt thích
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "views" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("views")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "views" && styles.activeTabText,
              ]}
            >
              Theo lượt nghe
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>{renderSongList()}</View>

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
    padding: SIZES.md,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: "bold",
    marginBottom: 8,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.hoverBg,
    borderRadius: 25,
    marginBottom: SIZES.md,
    overflow: "hidden",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: SIZES.sm,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.background,
  },
  listContainer: {
    flex: 1,
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
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    textAlign: "center",
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.sm,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    marginBottom: SIZES.xs,
  },
  playingItem: {
    backgroundColor: COLORS.cardBgHighlight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  rankNumberContainer: {
    width: 30,
    alignItems: "center",
    marginRight: SIZES.xs,
  },
  rankNumber: {
    fontSize: SIZES.md,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },
  topThreeRank: {
    color: COLORS.primary,
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
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  actionButton: {
    padding: 8,
  },
});
