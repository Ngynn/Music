import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  SafeAreaView, // Thêm SafeAreaView
  StatusBar, // Thêm StatusBar
  Platform, // Thêm Platform
} from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAudio } from "../context/audioContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import Slider from "@react-native-community/slider";
import ModalPlayer from "../components/modalPlayer";
import MiniPlayer from "../components/miniPlayer";
import { COLORS, SIZES } from "../constants/theme";

const { width } = Dimensions.get("window");

export default function Search() {
  const [songs, setSongs] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);

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
    setCurrentSongList,
    playPrevious,
    playNext,
    seekToPosition,
    togglePlaybackMode,
    playbackMode,
    autoPlayEnabled,
    handleLike,
    isLiked,
    setCurrentlyPlaying,
    currentSongId,
    isCurrentlyPlayingSong,
  } = useAudio();

  const fetchSongs = async () => {
    try {
      const snapshot = await getDocs(collection(db, "song"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSongs(data);
    } catch (error) {
      console.error("Lỗi khi lấy bài hát từ Firestore:", error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }

    const filteredSongs = songs.filter(
      (song) =>
        song.name.toLowerCase().includes(query.toLowerCase()) ||
        song.artist.toLowerCase().includes(query.toLowerCase()) ||
        (song.album && song.album.toLowerCase().includes(query.toLowerCase()))
    );

    setSearchResults(filteredSongs);
    if (filteredSongs.length > 0) {
      setCurrentSongList(filteredSongs);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={COLORS.background}
        barStyle="dark-content"
        translucent={true}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Tìm kiếm</Text>
        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={24}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập tên bài hát, nghệ sĩ, album..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Icon name="clear" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.trim() === "" ? (
          <View style={styles.emptyStateContainer}>
            <Icon name="search" size={60} color={COLORS.textSecondary} />
            <Text style={styles.hintText}>
              Nhập từ khóa để tìm kiếm bài hát, nghệ sĩ, album...
            </Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Icon
              name="sentiment-dissatisfied"
              size={60}
              color={COLORS.textSecondary}
            />
            <Text style={styles.noResultsText}>
              Không tìm thấy kết quả nào.
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.songItem,
                  isCurrentlyPlayingSong(item.id) && styles.playingItem,
                ]}
                onPress={() => playSound(searchResults, index)}
              >
                <Image source={{ uri: item.img }} style={styles.songImage} />
                <View style={styles.songDetails}>
                  <Text style={styles.songName}>{item.name}</Text>
                  <Text style={styles.songArtist}>{item.artist}</Text>
                  {item.album && (
                    <Text style={styles.songAlbum}>{item.album}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleLike(item.id);
                  }}
                >
                  <Icon
                    name={isLiked(item.id) ? "favorite" : "favorite-border"}
                    size={24}
                    color={
                      isLiked(item.id) ? COLORS.primary : COLORS.textSecondary
                    }
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            contentContainerStyle={{
              paddingBottom: miniPlayerHeight,
            }}
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
    padding: SIZES.md,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.hoverBg,
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: SIZES.md,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: COLORS.text,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.xl,
  },
  hintText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SIZES.md,
  },
  noResultsText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SIZES.md,
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
  },
  songArtist: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  songAlbum: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    opacity: 0.7,
  },
  likeButton: {
    padding: 8,
  },
});
