import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useAudio } from "./audioContext";
import { COLORS, SIZES } from "../constants/theme";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  increment,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";
import RenderModalPlaylist from "../crud/renderModalPlaylist";
import { useAlert } from "../context/alertContext";

const { width, height } = Dimensions.get("window");

interface MenuOptionsProps {
  visible: boolean;
  onClose: () => void;
  songId: string;
  songName?: string;
  songArtist?: string;
  songImage?: string;
}

const MenuOptions: React.FC<MenuOptionsProps> = ({
  visible,
  onClose,
  songId,
  songName = "",
  songArtist = "",
  songImage = "",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [createPlaylistModalVisible, setCreatePlaylistModalVisible] =
    useState(false);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);

  // state de check user co playlist hay ko
  const [userHasPlaylists, setUserHasPlaylists] = useState<boolean | null>(
    null
  ); // null = chưa check
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const router = useRouter();
  const { handleLike, isLiked } = useAudio();
  const { showAlert, confirm, success, error } = useAlert();

  // Reset states khi modal đóng
  useEffect(() => {
    if (!visible) {
      setIsLoading(false);
      setIsFetching(false);
      setShowPlaylistModal(false);
    }
  }, [visible]);

  // Cập nhật real-time listener
  useEffect(() => {
    if (!visible) return;

    const auth = getAuth();
    const userId = auth.currentUser?.uid;

    if (!userId) {
      console.error(" Không có người dùng đăng nhập");
      setUserPlaylists([]);
      setUserHasPlaylists(false);
      setCurrentUserId(null);
      setIsLoading(false);
      setIsFetching(false);
      return;
    }

    // Set current user ID
    setCurrentUserId(userId);

    // Chỉ set loading state lần đầu
    if (!hasInitialFetch) {
      setIsFetching(true);
      setIsLoading(true);
    }

    // lay playlist theo user id
    const playlistsQuery = query(
      collection(db, "playlists"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      playlistsQuery,
      async (snapshot) => {
        try {
          console.log(
            `🔄 Playlist listener triggered: ${snapshot.docs.length} playlists for user ${userId}`
          );

          // ktra user co playlist ko
          const hasPlaylists = !snapshot.empty;
          setUserHasPlaylists(hasPlaylists);

          if (!hasPlaylists) {
            console.log("📭 User has no playlists");
            setUserPlaylists([]);
            setHasInitialFetch(true);
            return;
          }

          //
          const playlistsWithSongs = await Promise.all(
            snapshot.docs.map(async (playlistDoc) => {
              try {
                const playlistData = playlistDoc.data();

                // double check userId, ktra playlist
                if (playlistData.userId !== userId) {
                  console.warn(
                    `⚠️ Playlist ${playlistDoc.id} doesn't belong to user ${userId}`
                  );
                  return null;
                }

                // Lấy songs trong playlist
                const songsQuery = query(
                  collection(db, "playlistSongs"),
                  where("playlistId", "==", playlistDoc.id)
                );
                const songsSnapshot = await getDocs(songsQuery);
                const songIds = songsSnapshot.docs.map(
                  (doc) => doc.data().songId
                );

                return {
                  id: playlistDoc.id,
                  ...playlistData,
                  songs: songIds.map((id) => ({ id })),
                };
              } catch (playlistError) {
                console.error(
                  `❌ Error processing playlist ${playlistDoc.id}:`,
                  playlistError
                );
                return null;
              }
            })
          );

          // Filter out null playlists và playlists không thuộc về user
          const validPlaylists = playlistsWithSongs.filter(Boolean);

          console.log(
            ` Setting ${validPlaylists.length} valid playlists for user ${userId}`
          );
          setUserPlaylists(validPlaylists);
          setHasInitialFetch(true);
        } catch (err) {
          console.error(" Lỗi khi lấy danh sách playlist:", err);
          setUserHasPlaylists(false);
          setUserPlaylists([]);
          error("Lỗi", "Không thể tải danh sách playlist");
        } finally {
          setIsLoading(false);
          setIsFetching(false);
        }
      },
      (err) => {
        console.error("❌ Lỗi listener playlist:", err);
        setUserHasPlaylists(false);
        setUserPlaylists([]);
        setIsLoading(false);
        setIsFetching(false);
      }
    );

    return () => {
      console.log("🧹 Cleaning up playlist listener");
      unsubscribe();
    };
  }, [visible, hasInitialFetch]);

  const handlePlaylistCreated = (playlistId: string) => {
    // Đóng menu
    onClose();
  };

  // Check if song exists in a playlist
  const checkIfSongInPlaylist = (songId: string, playlistId: string) => {
    const playlist = userPlaylists.find((p) => p.id === playlistId);
    if (!playlist || !playlist.songs) return false;
    // Kiểm tra xem songId có trong array songs không
    return playlist.songs.some((song: any) => song.id === songId);
  };

  // Add song to playlist
  const handleAddToPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    try {
      // Kiểm tra xem bài hát đã có trong playlist chưa
      const existingQuery = query(
        collection(db, "playlistSongs"),
        where("playlistId", "==", playlistId),
        where("songId", "==", songId)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        showAlert("Thông báo", "Bài hát đã có trong playlist");
        return;
      }

      await addDoc(collection(db, "playlistSongs"), {
        playlistId: playlistId,
        songId: songId,
        addedAt: serverTimestamp(),
      });

      const playlistRef = doc(db, "playlists", playlistId);
      await updateDoc(playlistRef, {
        songCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      success("Thành công", "Đã thêm bài hát vào playlist");
    } catch (err) {
      console.error("Lỗi khi thêm bài hát vào playlist:", err);
      error("Lỗi", "Không thể thêm bài hát vào playlist");
    } finally {
      setIsLoading(false);
    }
  };

  // Remove song from playlist
  const handleRemoveFromPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    try {
      // Tìm document trong playlistSongs
      const playlistSongsQuery = query(
        collection(db, "playlistSongs"),
        where("playlistId", "==", playlistId),
        where("songId", "==", songId)
      );
      const querySnapshot = await getDocs(playlistSongsQuery);

      if (querySnapshot.empty) {
        error("Lỗi", "Bài hát không có trong playlist");
        return;
      }

      // Xóa document trong playlistSongs
      const docToDelete = querySnapshot.docs[0];
      await deleteDoc(doc(db, "playlistSongs", docToDelete.id));

      // Cập nhật songCount trong playlist
      const playlistRef = doc(db, "playlists", playlistId);
      await updateDoc(playlistRef, {
        songCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      success("Thành công", "Đã xóa bài hát khỏi playlist");
    } catch (err) {
      console.error("Lỗi khi xóa bài hát khỏi playlist:", err);
      error("Lỗi", "Không thể xóa bài hát khỏi playlist");
    } finally {
      setIsLoading(false);
    }
  };

  //  CẬP NHẬT TOGGLE PLAYLIST MODAL VỚI LOGIC THÔNG MINH
  const togglePlaylistModal = useCallback(() => {
    console.log(
      `🎯 togglePlaylistModal called. userHasPlaylists: ${userHasPlaylists}, userPlaylists.length: ${userPlaylists.length}`
    );

    if (showPlaylistModal) {
      setShowPlaylistModal(false);
      return;
    }

    // KIỂM TRA USER CÓ PLAYLIST HAY KHÔNG
    if (userHasPlaylists === null) {
      // Vẫn đang check, hiển thị loading
      setIsLoading(true);
      showAlert("Đang kiểm tra", "Đang kiểm tra danh sách playlist...");
      return;
    }

    if (userHasPlaylists === false || userPlaylists.length === 0) {
      //  USER KHÔNG CÓ PLAYLIST - THÔNG BÁO TẠO MỚI
      confirm(
        "Tạo playlist đầu tiên",
        "Bạn chưa có playlist nào. Bạn có muốn tạo playlist đầu tiên để thêm bài hát này không?",
        () => {
          // User chọn "Có" - mở modal tạo playlist
          setCreatePlaylistModalVisible(true);
        },
        () => {
          // User chọn "Không" - đóng menu
          console.log("👤 User declined to create first playlist");
        }
      );
      return;
    }

    // USER CÓ PLAYLIST - HIỂN THỊ DANH SÁCH
    console.log(`📝 User has ${userPlaylists.length} playlists, showing list`);
    setShowPlaylistModal(true);
  }, [showPlaylistModal, userHasPlaylists, userPlaylists.length, confirm]);

  // Handle like/unlike song
  const handleLikeSong = () => {
    handleLike(songId);
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          {/* Song Info */}
          <View style={styles.songInfo}>
            <Image
              source={{ uri: songImage || "https://via.placeholder.com/60" }}
              style={styles.songImage}
            />
            <View style={styles.songDetails}>
              <Text style={styles.songName} numberOfLines={1}>
                {songName}
              </Text>
              <Text style={styles.songArtist} numberOfLines={1}>
                {songArtist}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Option Buttons */}
          <View style={styles.optionsContainer}>
            {/*  CẬP NHẬT OPTION BUTTON VỚI TRẠNG THÁI */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                userHasPlaylists === null && styles.optionButtonLoading,
              ]}
              onPress={togglePlaylistModal}
              disabled={userHasPlaylists === null}
            >
              <Icon
                name="playlist-add"
                size={24}
                color={
                  userHasPlaylists === null ? COLORS.textSecondary : COLORS.text
                }
              />
              <Text
                style={[
                  styles.optionText,
                  userHasPlaylists === null && styles.optionTextLoading,
                ]}
              >
                {userHasPlaylists === null
                  ? "Đang kiểm tra..."
                  : userHasPlaylists === false
                  ? "Tạo playlist đầu tiên"
                  : `Thêm vào playlist (${userPlaylists.length})`}
              </Text>
              {userHasPlaylists === null && (
                <ActivityIndicator
                  size="small"
                  color={COLORS.textSecondary}
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleLikeSong}
            >
              <Icon
                name={isLiked(songId) ? "favorite" : "favorite-border"}
                size={24}
                color={isLiked(songId) ? COLORS.primary : COLORS.text}
              />
              <Text style={styles.optionText}>
                {isLiked(songId) ? "Bỏ thích" : "Yêu thích"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() =>
                showAlert(
                  "Thông báo",
                  "Tính năng chia sẻ sẽ được phát triển trong tương lai"
                )
              }
            >
              <Icon name="share" size={24} color={COLORS.text} />
              <Text style={styles.optionText}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>

          {/* Playlist Selection Modal */}
          <Modal
            transparent={true}
            visible={showPlaylistModal}
            animationType="slide"
            onRequestClose={() => setShowPlaylistModal(false)}
          >
            <View style={styles.playlistModalContainer}>
              <View style={styles.playlistModalContent}>
                <View style={styles.playlistModalHeader}>
                  <Text style={styles.playlistModalTitle}>
                    Chọn playlist để thêm
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPlaylistModal(false)}
                    style={styles.closeModalButton}
                  >
                    <Icon name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {isLoading ? (
                  <ActivityIndicator
                    size="large"
                    color={COLORS.primary}
                    style={styles.loader}
                  />
                ) : (
                  <FlatList
                    data={userPlaylists}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                      <RefreshControl
                        refreshing={isFetching}
                        onRefresh={() => {
                          setHasInitialFetch(false);
                          setUserPlaylists([]);
                        }}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                      />
                    }
                    renderItem={({ item }) => {
                      const isInPlaylist = checkIfSongInPlaylist(
                        songId,
                        item.id
                      );
                      return (
                        <TouchableOpacity
                          style={[
                            styles.playlistItem,
                            isInPlaylist && styles.playlistItemActive,
                          ]}
                          onPress={() => {
                            if (isInPlaylist) {
                              confirm(
                                "Xóa khỏi playlist",
                                `Bạn có chắc chắn muốn xóa bài hát này khỏi playlist "${item.name}"?`,
                                () => {
                                  handleRemoveFromPlaylist(item.id);
                                  setShowPlaylistModal(false);
                                },
                                () => {}
                              );
                            } else {
                              handleAddToPlaylist(item.id);
                              setShowPlaylistModal(false);
                            }
                          }}
                        >
                          <View style={styles.playlistItemContent}>
                            <Image
                              source={{
                                uri:
                                  item.coverImg ||
                                  "https://via.placeholder.com/40",
                              }}
                              style={styles.playlistImage}
                            />
                            <Text style={styles.playlistName}>{item.name}</Text>
                          </View>
                          {isInPlaylist ? (
                            <Icon
                              name="check-circle"
                              size={24}
                              color={COLORS.primary}
                            />
                          ) : (
                            <Icon
                              name="add-circle-outline"
                              size={24}
                              color={COLORS.text}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <View style={styles.emptyListContainer}>
                        <Text style={styles.emptyListText}>
                          Bạn chưa có playlist nào
                        </Text>
                      </View>
                    }
                    ListFooterComponent={
                      <TouchableOpacity
                        style={styles.createPlaylistButton}
                        onPress={() => {
                          setCreatePlaylistModalVisible(true);
                        }}
                      >
                        <Icon
                          name="add-circle"
                          size={24}
                          color={COLORS.primary}
                        />
                        <Text style={styles.createPlaylistText}>
                          Tạo playlist mới
                        </Text>
                      </TouchableOpacity>
                    }
                  />
                )}
              </View>
            </View>
          </Modal>
          <RenderModalPlaylist
            visible={createPlaylistModalVisible}
            onClose={() => setCreatePlaylistModalVisible(false)}
            songId={songId}
            songName={songName}
            songArtist={songArtist}
            songImage={songImage}
            onPlaylistCreated={handlePlaylistCreated}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SIZES.md,
    minHeight: height * 0.3,
  },
  songInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: SIZES.md,
  },
  songDetails: {
    flex: 1,
  },
  songName: {
    fontSize: SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  songArtist: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  closeButton: {
    padding: 8,
  },
  optionsContainer: {
    marginTop: SIZES.md,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    minHeight: 56, // Consistent height
  },
  optionButtonLoading: {
    opacity: 0.6,
  },
  optionText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginLeft: SIZES.md,
  },
  optionTextLoading: {
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  playlistModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  playlistModalContent: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: "hidden",
  },
  playlistModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  playlistModalTitle: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  closeModalButton: {
    padding: 4,
  },
  loader: {
    padding: SIZES.xl * 2,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  playlistItemActive: {
    backgroundColor: COLORS.hoverBg,
  },
  playlistItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  playlistImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: SIZES.md,
  },
  playlistName: {
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  emptyListContainer: {
    padding: SIZES.xl,
    alignItems: "center",
  },
  emptyListText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  createPlaylistButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.md,
    marginVertical: SIZES.md,
  },
  createPlaylistText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: "bold",
    marginLeft: SIZES.sm,
  },
});

export default MenuOptions;
