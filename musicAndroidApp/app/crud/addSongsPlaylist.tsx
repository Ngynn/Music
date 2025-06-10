import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  addDoc,
  where,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS, SIZES } from "../constants/theme";
import { useAlert } from "../context/alertContext"; // ✅ THÊM IMPORT

// Lấy width của màn hình
const { width } = Dimensions.get("window");

interface Song {
  id: string;
  name: string;
  artist: string;
  img: string;
  album?: string;
  audio: string;
  likes?: number;
  views?: number;
}

export default function AddSongsPlaylist() {
  const { playlistId } = useLocalSearchParams();
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [playlistSongIds, setPlaylistSongIds] = useState<Set<string>>(
    new Set()
  );
  const [playlistName, setPlaylistName] = useState("");
  const router = useRouter();

  const { success, error, confirm } = useAlert();

  // Helper function để format số lượng like/view
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
    const fetchPlaylistAndSongs = async () => {
      try {
        // Fetch playlist details to show the name
        const playlistDoc = await getDoc(
          doc(db, "playlists", playlistId as string)
        );
        if (playlistDoc.exists()) {
          setPlaylistName(playlistDoc.data().name);
        }

        // Fetch all songs that are already in the playlist
        const songQuery = query(
          collection(db, "playlistSongs"),
          where("playlistId", "==", playlistId)
        );
        const songSnapshot = await getDocs(songQuery);
        const existingSongs = new Set<string>();
        songSnapshot.forEach((doc) => {
          existingSongs.add(doc.data().songId);
        });
        setPlaylistSongIds(existingSongs);

        // Fetch all available songs
        const allSongsSnapshot = await getDocs(collection(db, "song"));
        const songs: Song[] = [];
        allSongsSnapshot.forEach((doc) => {
          songs.push({
            id: doc.id,
            ...doc.data(),
          } as Song);
        });

        setAllSongs(songs);
        setFilteredSongs(songs);
      } catch (err) {
        console.error("Error fetching songs:", err);
        error("Lỗi", "Không thể tải danh sách bài hát");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistAndSongs();
  }, [playlistId, error]); // error tránh eslint warning

  useEffect(() => {
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      const filtered = allSongs.filter(
        (song) =>
          song.name.toLowerCase().includes(searchLower) ||
          song.artist.toLowerCase().includes(searchLower) ||
          (song.album && song.album.toLowerCase().includes(searchLower))
      );
      setFilteredSongs(filtered);
    } else {
      setFilteredSongs(allSongs);
    }
  }, [searchText, allSongs]);

  // them bai hat vao playlist
  const addSongToPlaylist = async (song: Song) => {
    try {
      // Check if song is already added
      if (playlistSongIds.has(song.id)) {
        success("Thông báo", "Bài hát đã có trong playlist");
        return;
      }

      confirm(
        "Thêm bài hát",
        `Bạn có muốn thêm "${song.name}" vào playlist "${playlistName}"?`,
        async () => {
          try {
            // Add song to playlist
            await addDoc(collection(db, "playlistSongs"), {
              playlistId: playlistId,
              songId: song.id,
              addedAt: serverTimestamp(),
            });

            // Update song count in playlist
            const playlistRef = doc(db, "playlists", playlistId as string);
            await updateDoc(playlistRef, {
              songCount: increment(1),
              updatedAt: serverTimestamp(),
            });

            // Update local state
            setPlaylistSongIds(new Set([...playlistSongIds, song.id]));

            success("Thành công", `Đã thêm "${song.name}" vào playlist`);
          } catch (err) {
            console.error("Error adding song to playlist:", err);
            error("Lỗi", "Không thể thêm bài hát vào playlist");
          }
        },
        () => {
          // Callback khi user hủy - không cần làm gì
          console.log("User cancelled adding song");
        }
      );
    } catch (err) {
      console.error("Error in addSongToPlaylist:", err);
      error("Lỗi", "Đã có lỗi xảy ra");
    }
  };

  // function xử lý quay lại với confirm nếu có thay đổi
  const handleBackPress = () => {
    if (searchText.trim()) {
      // Nếu đang có text tìm kiếm, xóa text trước
      setSearchText("");
    } else {
      // Nếu không có thay đổi gì, quay lại luôn
      router.back();
    }
  };

  // function xử lý xóa tìm kiếm với confirm
  const handleClearSearch = () => {
    if (filteredSongs.length < allSongs.length && filteredSongs.length > 0) {
      confirm(
        "Xóa tìm kiếm",
        "Bạn có muốn xóa từ khóa tìm kiếm và hiển thị tất cả bài hát?",
        () => {
          setSearchText("");
        }
      );
    } else {
      setSearchText("");
    }
  };

  // 
  const renderSongItem = ({ item }: { item: Song }) => (
    <View style={styles.songItem}>
      <Image source={{ uri: item.img }} style={styles.songImage} />

      <View style={styles.songDetails}>
        <Text style={styles.songName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist}
        </Text>

        {/* Hiển thị số lượng like/view */}
        <View style={styles.statsRow}>
          <Icon name="favorite" size={14} color={COLORS.primary} />
          <Text style={styles.statText}>{formatNumber(item.likes || 0)}</Text>
          <Icon
            name="visibility"
            size={14}
            color={COLORS.textSecondary}
            style={{ marginLeft: 10 }}
          />
          <Text style={styles.statText}>{formatNumber(item.views || 0)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addButton,
          playlistSongIds.has(item.id) && styles.addedButton,
        ]}
        onPress={() => addSongToPlaylist(item)}
        disabled={playlistSongIds.has(item.id)} 
      >
        <Icon
          name={playlistSongIds.has(item.id) ? "check" : "add"}
          size={24}
          color={playlistSongIds.has(item.id) ? COLORS.primary : COLORS.text}
        />
      </TouchableOpacity>
    </View>
  );

  // ✅ THÊM: Render empty state với nhiều thông tin hơn
  const renderEmptyState = () => {
    if (loading) return null;

    const isSearching = searchText.trim() !== "";
    const hasResults = filteredSongs.length > 0;

    if (!hasResults && isSearching) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search-off" size={60} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
          <Text style={styles.emptyText}>
            Không có bài hát nào phù hợp với "{searchText}"
          </Text>
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchText("")}
          >
            <Text style={styles.clearSearchText}>Xóa tìm kiếm</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!hasResults && !isSearching && allSongs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="music-off" size={60} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Chưa có bài hát</Text>
          <Text style={styles.emptyText}>
            Hệ thống chưa có bài hát nào để thêm vào playlist
          </Text>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách bài hát...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackPress} 
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Thêm bài hát</Text>
          <Text style={styles.playlistNameText}>Playlist: {playlistName}</Text>
        </View>

        {/* Info button để hiển thị thống kê */}
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => {
            const addedCount = playlistSongIds.size;
            const totalCount = allSongs.length;
            success(
              "Thống kê Playlist",
              `Đã thêm: ${addedCount} bài hát\nTổng cộng: ${totalCount} bài hát có sẵn\nCòn lại: ${
                totalCount - addedCount
              } bài hát`
            );
          }}
        >
          <Icon name="info-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search input with icon */}
      <View style={styles.searchContainer}>
        <Icon
          name="search"
          size={20}
          color={COLORS.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm bài hát, nghệ sĩ, album..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={handleClearSearch} 
            style={styles.clearButton}
          >
            <Icon name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search results info */}
      {searchText.trim() !== "" && (
        <View style={styles.searchResultsInfo}>
          <Text style={styles.searchResultsText}>
            {filteredSongs.length > 0
              ? `Tìm thấy ${filteredSongs.length} bài hát`
              : "Không tìm thấy kết quả"}
          </Text>
        </View>
      )}

      {filteredSongs.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderSongItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 75, 
            offset: 75 * index,
            index,
          })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  // Loading text style
  loadingText: {
    marginTop: 16,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.xxl,
    paddingBottom: SIZES.xl,
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
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
  },
  playlistNameText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    marginTop: 2,
  },
  // Info button style
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.hoverBg,
    marginLeft: SIZES.sm,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    height: 50,
    backgroundColor: COLORS.cardBg,
    borderRadius: 25,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  clearButton: {
    padding: 8,
  },
  // Search results info styles
  searchResultsInfo: {
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.sm,
  },
  searchResultsText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  listContent: {
    padding: SIZES.md,
    gap: SIZES.xs,
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SIZES.sm,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    marginBottom: SIZES.xs,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    // Elevation for Android
    elevation: 2,
  },
  songImage: {
    width: 55,
    height: 55,
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
  // Thêm styles cho hiển thị like/view
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.hoverBg,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SIZES.sm,
  },
  addedButton: {
    backgroundColor: COLORS.primary + "30", // Alpha transparency for the primary color
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.xl,
  },
  // Empty state styles
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: "center",
    marginBottom: SIZES.lg,
    lineHeight: 22,
  },
  clearSearchButton: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  clearSearchText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: "bold",
  },
});
