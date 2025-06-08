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
  Alert,
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
      } catch (error) {
        console.error("Error fetching songs:", error);
        Alert.alert("Lỗi", "Không thể tải danh sách bài hát");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistAndSongs();
  }, [playlistId]);

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

  const addSongToPlaylist = async (song: Song) => {
    try {
      // Check if song is already added
      if (playlistSongIds.has(song.id)) {
        Alert.alert("Thông báo", "Bài hát đã có trong playlist");
        return;
      }

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
      Alert.alert("Thành công", `Đã thêm "${song.name}" vào playlist`);
    } catch (error) {
      console.error("Error adding song to playlist:", error);
      Alert.alert("Lỗi", "Không thể thêm bài hát vào playlist");
    }
  };

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
      >
        <Icon
          name={playlistSongIds.has(item.id) ? "check" : "add"}
          size={24}
          color={playlistSongIds.has(item.id) ? COLORS.primary : COLORS.text}
        />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Thêm bài hát</Text>
          <Text style={styles.playlistNameText}>Playlist: {playlistName}</Text>
        </View>
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
            onPress={() => setSearchText("")}
            style={styles.clearButton}
          >
            <Icon name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {filteredSongs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="music-off" size={60} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            {searchText.trim() === ""
              ? "Nhập từ khóa để tìm kiếm bài hát"
              : "Không tìm thấy bài hát phù hợp"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderSongItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    textAlign: "center",
    marginTop: SIZES.lg,
  },
});
