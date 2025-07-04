import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  ActionSheetIOS,
} from "react-native";
import { router } from "expo-router";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp as FirebaseTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useAudio } from "../context/audioContext";
import * as ImagePicker from "expo-image-picker";
import ModalPlayer from "../components/modalPlayer";
import MiniPlayer from "../components/miniPlayer";
import { COLORS, SIZES } from "../constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import { useAlert } from "../context/alertContext";

// Thêm khai báo width
const { width, height } = Dimensions.get("window");

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImg: string;
  userId: string;
  createdAt: Date | FirebaseTimestamp;
  updatedAt: Date | FirebaseTimestamp;
}

export default function Playlists() {
  const { confirm, success, error } = useAlert();

  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [selectedCoverImg, setSelectedCoverImg] = useState<string | null>(null);
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPlaylistOptions, setShowPlaylistOptions] = useState<string | null>(
    null
  );
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  );

  const auth = getAuth();
  const user = auth.currentUser;

  const {
    likedSongs,
    currentSong,
    currentlyPlaying,
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
  } = useAudio();

  const uploadToCloudinary = useCallback(async (imageUri: string) => {
    try {
      const formData = new FormData();

      const file = {
        uri: imageUri,
        type: "image/jpeg",
        name: "upload.jpg",
      };

      formData.append("file", file as any);
      formData.append("upload_preset", "mp3_unsigned");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dfn3a005q/image/upload`,
        {
          method: "POST",
          body: formData,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Lỗi khi tải ảnh lên Cloudinary:", error);
      throw error;
    }
  }, []);

  const fetchUserPlaylists = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "playlists"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const playlists: Playlist[] = [];

      querySnapshot.forEach((doc) => {
        playlists.push({
          id: doc.id,
          ...doc.data(),
        } as Playlist);
      });

      setUserPlaylists(playlists);
    } catch (error) {
      console.error("Lỗi khi tải danh sách playlist:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchUserPlaylists();
    }, [fetchUserPlaylists])
  );

  const createPlaylist = useCallback(async () => {
    if (!user) {
      error("Lỗi", "Bạn cần đăng nhập để tạo playlist");
      return;
    }

    if (!newPlaylistName.trim()) {
      error("Lỗi", "Vui lòng nhập tên playlist");
      return;
    }

    setIsProcessing(true);
    try {
      let coverImgUrl = selectedCoverImg;

      if (selectedCoverImg) {
        coverImgUrl = await uploadToCloudinary(selectedCoverImg);
      }

      const newPlaylist = {
        name: newPlaylistName.trim(),
        description: newPlaylistDesc.trim(),
        coverImg: coverImgUrl || "https://via.placeholder.com/150",
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "playlists"), newPlaylist);

      setUserPlaylists((prev) => [
        ...prev,
        {
          id: docRef.id,
          ...newPlaylist,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      setModalVisible(false);
      setNewPlaylistName("");
      setNewPlaylistDesc("");
      setSelectedCoverImg(null);

      router.push({
        pathname: "/playlist/[id]",
        params: { id: docRef.id },
      });
      success("Thành công", "Playlist đã được tạo");
    } catch (err) {
      console.error("Lỗi khi tạo playlist:", err);
      error("Lỗi", "Không thể tạo playlist. Vui lòng thử lại sau.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    user,
    newPlaylistName,
    newPlaylistDesc,
    selectedCoverImg,
    uploadToCloudinary,
    success,
    error,
  ]);

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      confirm(
        "Xác nhận xóa",
        "Bạn có chắc chắn muốn xóa playlist này?",
        async () => {
          try {
            await deleteDoc(doc(db, "playlists", playlistId));

            const songsQuery = query(
              collection(db, "playlistSongs"),
              where("playlistId", "==", playlistId)
            );

            const songsSnapshot = await getDocs(songsQuery);
            const deletePromises: Promise<void>[] = [];

            songsSnapshot.forEach((doc) => {
              deletePromises.push(deleteDoc(doc.ref));
            });

            await Promise.all(deletePromises);

            setUserPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
            success("Thành công", "Đã xóa playlist");
          } catch (err) {
            console.error("Lỗi khi xóa playlist:", err);
            error("Lỗi", "Không thể xóa playlist. Vui lòng thử lại sau.");
          }
        }
      );
    },
    [confirm, success, error]
  );

  const updatePlaylist = useCallback(async () => {
    if (!editingPlaylist || !newPlaylistName.trim()) {
      error("Lỗi", "Vui lòng nhập tên playlist");
      return;
    }

    setIsProcessing(true);

    try {
      let coverImgUrl = selectedCoverImg;

      if (selectedCoverImg && selectedCoverImg !== editingPlaylist.coverImg) {
        coverImgUrl = await uploadToCloudinary(selectedCoverImg);
      }

      const playlistRef = doc(db, "playlists", editingPlaylist.id);
      await updateDoc(playlistRef, {
        name: newPlaylistName.trim(),
        description: newPlaylistDesc.trim(),
        coverImg: coverImgUrl || editingPlaylist.coverImg,
        updatedAt: serverTimestamp(),
      });

      setUserPlaylists((prev) =>
        prev.map((p) =>
          p.id === editingPlaylist.id
            ? {
                ...p,
                name: newPlaylistName.trim(),
                description: newPlaylistDesc.trim(),
                coverImg: coverImgUrl || editingPlaylist.coverImg,
                updatedAt: new Date(),
              }
            : p
        )
      );

      setModalVisible(false);
      setEditingPlaylist(null);
      setNewPlaylistName("");
      setNewPlaylistDesc("");
      setSelectedCoverImg(null);
      success("Thành công", "Playlist đã được cập nhật");
    } catch (err) {
      console.error("Lỗi khi cập nhật playlist:", err);
      error("Lỗi", "Không thể cập nhật playlist. Vui lòng thử lại sau.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    editingPlaylist,
    newPlaylistName,
    newPlaylistDesc,
    selectedCoverImg,
    uploadToCloudinary,
    success,
    error,
  ]);

  const handleEditPlaylist = useCallback((playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setNewPlaylistName(playlist.name);
    setNewPlaylistDesc(playlist.description || "");
    setSelectedCoverImg(playlist.coverImg);
    setModalVisible(true);
  }, []);

  const handleSelectCoverImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedCoverImg(result.assets[0].uri);
    }
  }, []);

  const showPlaylistMenu = useCallback(
    (playlist: Playlist) => {
      setSelectedPlaylist(playlist);

      if (Platform.OS === "ios") {
        const options = ["Hủy", "Chỉnh sửa playlist", "Xóa playlist"];
        const cancelButtonIndex = 0;
        const destructiveButtonIndex = 2;

        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
            destructiveButtonIndex,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              handleEditPlaylist(playlist);
            } else if (buttonIndex === 2) {
              deletePlaylist(playlist.id);
            }
          }
        );
      } else {
        setShowPlaylistOptions(playlist.id);
      }
    },
    [handleEditPlaylist, deletePlaylist]
  );

  const handleFavoritePress = useCallback(() => {
    console.log("TouchableOpacity pressed!");
    console.log("likedSongs size:", likedSongs?.size);
    try {
      router.push("/favoritePlaylist/_favPlaylist");
      console.log("Router push called successfully");
    } catch (error) {
      console.error("Router push error:", error);
    }
  }, [likedSongs?.size]);

  const handleCreatePlaylistPress = useCallback(() => {
    setEditingPlaylist(null);
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    setSelectedCoverImg(null);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isProcessing) {
      setModalVisible(false);
      setEditingPlaylist(null);
      setNewPlaylistName("");
      setNewPlaylistDesc("");
      setSelectedCoverImg(null);
    }
  }, [isProcessing]);

  const ListHeaderComponent = useMemo(
    () => (
      <>
        <TouchableOpacity
          style={[styles.favoriteCard, { zIndex: 999, elevation: 10 }]}
          onPress={handleFavoritePress}
          activeOpacity={0.7}
        >
          <View style={styles.favoriteIconContainer}>
            <Icon name="favorite" size={36} color={COLORS.error} />
          </View>
          <View style={styles.favoriteDetails}>
            <Text style={styles.favoriteTitle}>Bài hát yêu thích</Text>
            <Text style={styles.favoriteSubtitle}>
              {likedSongs?.size || 0} bài hát
            </Text>
          </View>
          <Icon name="chevron-right" size={26} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Playlist của bạn</Text>

        {userPlaylists.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="queue-music" size={60} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              Bạn chưa có playlist nào. Tạo playlist đầu tiên ngay!
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={handleCreatePlaylistPress}
            >
              <Text style={styles.emptyCreateButtonText}>Tạo playlist</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    ),
    [
      likedSongs?.size,
      userPlaylists.length,
      handleFavoritePress,
      handleCreatePlaylistPress,
    ]
  );

  // **FIX 12: Memoize renderItem**
  const renderItem = useCallback(
    ({ item }: { item: Playlist }) => (
      <TouchableOpacity
        style={styles.playlistItem}
        onPress={() =>
          router.push({
            pathname: "/playlist/[id]",
            params: { id: item.id },
          })
        }
      >
        <Image source={{ uri: item.coverImg }} style={styles.playlistCover} />
        <View style={styles.playlistDetails}>
          <Text style={styles.playlistName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.playlistDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={(e) => {
            e.stopPropagation();
            showPlaylistMenu(item);
          }}
        >
          <Icon name="more-vert" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [showPlaylistMenu]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Playlist của tôi</Text>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  function renderModal() {
    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPlaylist ? "Chỉnh sửa Playlist" : "Tạo Playlist"}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={handleCloseModal}
                disabled={isProcessing}
              >
                <Icon name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.coverImageContainer}>
              <Image
                source={{
                  uri: selectedCoverImg || "https://via.placeholder.com/150",
                }}
                style={styles.coverImage}
              />
              <TouchableOpacity
                style={styles.editCoverButton}
                onPress={handleSelectCoverImage}
                disabled={isProcessing}
              >
                <Icon name="edit" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Tên Playlist</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên playlist"
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  editable={!isProcessing}
                  maxLength={50}
                />
                <Text style={styles.charCount}>
                  {newPlaylistName.length}/50
                </Text>
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Mô tả (tuỳ chọn)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập mô tả cho playlist"
                  value={newPlaylistDesc}
                  onChangeText={setNewPlaylistDesc}
                  editable={!isProcessing}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.charCount}>
                  {newPlaylistDesc.length}/200
                </Text>
              </View>
            </View>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={handleCloseModal}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={editingPlaylist ? updatePlaylist : createPlaylist}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <View style={styles.loadingButtonContent}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={styles.confirmButtonText}>
                      {editingPlaylist ? "Đang lưu..." : "Đang tạo..."}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {editingPlaylist ? "Lưu thay đổi" : "Tạo Playlist"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderOptionsModal() {
    if (!showPlaylistOptions || !selectedPlaylist) return null;

    return (
      <Modal
        visible={!!showPlaylistOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlaylistOptions(null)}
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowPlaylistOptions(null)}
        >
          <View style={styles.optionsContainer}>
            <View style={styles.playlistInfoInModal}>
              <Image
                source={{ uri: selectedPlaylist.coverImg }}
                style={styles.modalPlaylistImage}
              />
              <View style={styles.modalPlaylistInfo}>
                <Text style={styles.modalPlaylistName}>
                  {selectedPlaylist.name}
                </Text>
                {selectedPlaylist.description ? (
                  <Text
                    style={styles.modalPlaylistDescription}
                    numberOfLines={2}
                  >
                    {selectedPlaylist.description}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowPlaylistOptions(null);
                handleEditPlaylist(selectedPlaylist);
              }}
            >
              <Icon name="edit" size={24} color={COLORS.primary} />
              <Text style={styles.optionText}>Chỉnh sửa playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowPlaylistOptions(null);
                deletePlaylist(selectedPlaylist.id);
              }}
            >
              <Icon name="delete" size={24} color={COLORS.error} />
              <Text style={[styles.optionText, { color: COLORS.error }]}>
                Xóa playlist
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
          <Text style={styles.title}>Playlist của tôi</Text>
        </View>

        <FlatList
          data={userPlaylists}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeaderComponent}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: miniPlayerHeight ? miniPlayerHeight + 80 : 100,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={null}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />

        <TouchableOpacity
          style={[
            styles.fab,
            { bottom: miniPlayerHeight ? miniPlayerHeight + 20 : 30 },
          ]}
          onPress={handleCreatePlaylistPress}
          activeOpacity={0.8}
        >
          <Icon name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>

        {renderModal()}
        {renderOptionsModal()}

        <ModalPlayer
          visible={showPlayer}
          currentSong={currentSong}
          isPlaying={isPlaying}
          duration={duration}
          currentPosition={currentPosition}
          isRepeat={isRepeat}
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
  favoriteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    marginTop: SIZES.xl,
  },
  favoriteIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "rgba(207, 102, 121, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.md,
  },
  favoriteDetails: {
    flex: 1,
  },
  favoriteTitle: {
    fontSize: SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
  favoriteSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  createButtonText: {
    fontSize: SIZES.md,
    fontWeight: "bold",
    color: COLORS.background,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  emptyContainer: {
    padding: SIZES.lg,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  playlistDetails: {
    flex: 1,
    marginLeft: SIZES.sm,
  },
  playlistName: {
    fontSize: SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
  playlistDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  playlistActions: {
    flexDirection: "row",
    width: 80,
    justifyContent: "space-between",
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.hoverBg,
  },
  loginMessage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  loginText: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 16,
    marginTop: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SIZES.lg,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hoverBg,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  closeModalButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
  },
  coverImageContainer: {
    alignItems: "center",
    marginVertical: SIZES.md,
    position: "relative",
  },
  coverImage: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: 10,
    backgroundColor: COLORS.cardBg,
  },
  editCoverButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  formContainer: {
    width: "100%",
    marginVertical: SIZES.md,
  },
  inputWrapper: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.hoverBg,
  },
  textArea: {
    minHeight: 100,
    maxHeight: 140,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SIZES.md,
  },

  cancelButton: {
    backgroundColor: COLORS.cardBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.hoverBg,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: SIZES.md,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: SIZES.md,
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  menuButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsModalOverlay: {
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
  playlistInfoInModal: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hoverBg,
  },
  modalPlaylistImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: SIZES.md,
  },
  modalPlaylistInfo: {
    flex: 1,
  },
  modalPlaylistName: {
    fontSize: SIZES.md,
    fontWeight: "bold",
    color: COLORS.text,
  },
  modalPlaylistDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  emptyCreateButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  emptyCreateButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hoverBg,
  },
});
