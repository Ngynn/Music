import React, { useState, useEffect } from "react";
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
  // Thêm hook useAlert
  const { confirm, prompt, success, error } = useAlert();

  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [selectedCoverImg, setSelectedCoverImg] = useState<string | null>(null);
  const [miniPlayerHeight, setMiniPlayerHeight] = useState(0);

  // Thêm state mới để quản lý trạng thái loading trong modal
  const [isProcessing, setIsProcessing] = useState(false);

  // Thêm state mới để hiển thị menu tùy chọn
  const [showPlaylistOptions, setShowPlaylistOptions] = useState<string | null>(
    null
  );
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  );

  const auth = getAuth();
  const user = auth.currentUser;

  // Cập nhật import từ context và thêm currentSongId, isCurrentlyPlayingSong
  const {
    likedSongs,
    playSound,
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
    playbackMode,
    autoPlayEnabled,
    setCurrentSongList,
    currentSongId, // Thêm mới
    isCurrentlyPlayingSong, // Thêm mới
  } = useAudio();

  // Hàm tải ảnh lên Cloudinary
  const uploadToCloudinary = async (imageUri: string) => {
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
  };

  // lay ds playlist cua user
  const fetchUserPlaylists = async () => {
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
  };

  // useEffect(() => {
  //   fetchUserPlaylists();
  // }, [user]);

  // Thay thế useEffect fetch data bằng useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      // Fetch data mỗi khi tab được focus
      fetchUserPlaylists();
    }, [])
  );

  // tao playlist
  const createPlaylist = async () => {
    if (!user) {
      // Thay Alert.alert bằng error
      error("Lỗi", "Bạn cần đăng nhập để tạo playlist");
      return;
    }

    if (!newPlaylistName.trim()) {
      // Thay Alert.alert bằng error
      error("Lỗi", "Vui lòng nhập tên playlist");
      return;
    }

    // Phần còn lại giữ nguyên
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

      setUserPlaylists([
        ...userPlaylists,
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
      // Thêm thông báo thành công
      success("Thành công", "Playlist đã được tạo");
    } catch (err) {
      console.error("Lỗi khi tạo playlist:", err);
      // Thay Alert.alert bằng error
      error("Lỗi", "Không thể tạo playlist. Vui lòng thử lại sau.");
    } finally {
      setIsProcessing(false);
    }
  };

  // xoa playlist
  const deletePlaylist = async (playlistId: string) => {
    // Thay Alert.alert bằng confirm
    confirm(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa playlist này?",
      async () => {
        try {
          await deleteDoc(doc(db, "playlists", playlistId));

          // lay ds bai hat trong playlist theo playlistId
          const songsQuery = query(
            collection(db, "playlistSongs"),
            where("playlistId", "==", playlistId)
          );
          
          // lay thong tin bai hat trong playlist
          const songsSnapshot = await getDocs(songsQuery);
          const deletePromises: Promise<void>[] = [];

          // tao promise xoa tung bai hat trong playlist
          songsSnapshot.forEach((doc) => {
            deletePromises.push(deleteDoc(doc.ref));
          });

          //execute 
          await Promise.all(deletePromises);

          setUserPlaylists(userPlaylists.filter((p) => p.id !== playlistId));
          success("Thành công", "Đã xóa playlist");
        } catch (err) {
          console.error("Lỗi khi xóa playlist:", err);
          error("Lỗi", "Không thể xóa playlist. Vui lòng thử lại sau.");
        }
      }
    );
  };

  // sua playlist
  const updatePlaylist = async () => {
    if (!editingPlaylist || !newPlaylistName.trim()) {
      error("Lỗi", "Vui lòng nhập tên playlist");
      return;
    }

    // Bắt đầu xử lý - set isProcessing thành true
    setIsProcessing(true);

    try {
      let coverImgUrl = selectedCoverImg;

      if (selectedCoverImg && selectedCoverImg !== editingPlaylist.coverImg) {
        coverImgUrl = await uploadToCloudinary(selectedCoverImg);
      }

      // cap nhat playlist trong firestore
      const playlistRef = doc(db, "playlists", editingPlaylist.id);
      await updateDoc(playlistRef, {
        name: newPlaylistName.trim(),
        description: newPlaylistDesc.trim(),
        coverImg: coverImgUrl || editingPlaylist.coverImg,
        updatedAt: serverTimestamp(),
      });

      // refresh de hien thi info moi
      setUserPlaylists(
        userPlaylists.map((p) =>
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
      // Thêm thông báo thành công
      success("Thành công", "Playlist đã được cập nhật");
    } catch (err) {
      console.error("Lỗi khi cập nhật playlist:", err);
      error("Lỗi", "Không thể cập nhật playlist. Vui lòng thử lại sau.");
    } finally {
      setIsProcessing(false);
    }
  };

  // xu ly khi user nhan nut sua playlist
  const handleEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setNewPlaylistName(playlist.name);
    setNewPlaylistDesc(playlist.description || "");
    setSelectedCoverImg(playlist.coverImg);
    setModalVisible(true);
  };

  // xu ly khi user chon anh bia playlist
  const handleSelectCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedCoverImg(result.assets[0].uri);
    }
  };

  // Thêm hàm hiển thị menu tùy chọn cho playlist
  const showPlaylistMenu = (playlist: Playlist) => {
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
      // Cho Android, sử dụng Modal
      setShowPlaylistOptions(playlist.id);
    }
  };

  // Thêm hàm render modal options cho Android
  const renderOptionsModal = () => {
    if (!showPlaylistOptions || !selectedPlaylist) return null;

    return (
      <Modal
        transparent={true}
        visible={!!showPlaylistOptions}
        onRequestClose={() => setShowPlaylistOptions(null)}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlaylistOptions(null)}
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
                {selectedPlaylist.description && (
                  <Text
                    style={styles.modalPlaylistDescription}
                    numberOfLines={1}
                  >
                    {selectedPlaylist.description}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowPlaylistOptions(null);
                handleEditPlaylist(selectedPlaylist);
              }}
            >
              <Icon name="edit" size={24} color={COLORS.text} />
              <Text style={styles.optionText}>Chỉnh sửa playlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowPlaylistOptions(null);
                deletePlaylist(selectedPlaylist.id);
              }}
            >
              <Icon
                name="delete-outline"
                size={24}
                color={COLORS.error || "#f44336"}
              />
              <Text
                style={{
                  ...styles.optionText,
                  color: COLORS.error || "#f44336",
                }}
              >
                Xóa playlist
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // render modal 
  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        // Chỉ cho phép đóng modal khi không trong trạng thái xử lý
        if (!isProcessing) {
          setModalVisible(false);
          setEditingPlaylist(null);
          setNewPlaylistName("");
          setNewPlaylistDesc("");
          setSelectedCoverImg(null);
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header với nút đóng */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPlaylist ? "Chỉnh sửa Playlist" : "Tạo Playlist Mới"}
            </Text>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                if (!isProcessing) {
                  setModalVisible(false);
                  setEditingPlaylist(null);
                  setNewPlaylistName("");
                  setNewPlaylistDesc("");
                  setSelectedCoverImg(null);
                }
              }}
              disabled={isProcessing}
            >
              <Icon name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Ảnh bìa playlist */}
          <TouchableOpacity
            style={styles.coverImageContainer}
            onPress={handleSelectCoverImage}
            disabled={isProcessing}
          >
            <Image
              source={{
                uri:
                  selectedCoverImg ||
                  "https://images.rawpixel.com/image_png_800/cHJpdmF0ZS9zci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA5L3JtNTgxLWVsZW1lbnQtMTA3LnBuZw.png",
              }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <View style={styles.editCoverButton}>
              <Icon name="photo-camera" size={20} color={COLORS.white} />
            </View>
          </TouchableOpacity>

          {/* Form input */}
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Tên Playlist</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên playlist"
                placeholderTextColor={COLORS.textSecondary}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                editable={!isProcessing}
                maxLength={30}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Mô tả (Tùy chọn)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Thêm mô tả về playlist này..."
                placeholderTextColor={COLORS.textSecondary}
                value={newPlaylistDesc}
                onChangeText={setNewPlaylistDesc}
                multiline
                editable={!isProcessing}
                maxLength={200}
              />
              <Text style={styles.charCount}>{newPlaylistDesc.length}/200</Text>
            </View>
          </View>

          {/* Nút hành động */}
          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                isProcessing && styles.disabledButton,
              ]}
              onPress={() => {
                setModalVisible(false);
                setEditingPlaylist(null);
                setNewPlaylistName("");
                setNewPlaylistDesc("");
                setSelectedCoverImg(null);
              }}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.confirmButton,
                (!newPlaylistName.trim() || isProcessing) &&
                  styles.disabledButton,
              ]}
              onPress={editingPlaylist ? updatePlaylist : createPlaylist}
              disabled={!newPlaylistName.trim() || isProcessing}
            >
              {isProcessing ? (
                <View style={styles.loadingButtonContent}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.confirmButtonText}>
                    {editingPlaylist ? "Đang cập nhật..." : "Đang tạo..."}
                  </Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>
                  {editingPlaylist ? "Cập nhật" : "Tạo mới"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // if (!user) {
  //   return (
  //     <View style={styles.container}>
  //       <Text style={styles.title}>Playlist của tôi</Text>
  //       <View style={styles.loginMessage}>
  //         <Icon name="account-circle" size={60} color={COLORS.textSecondary} />
  //         <Text style={styles.loginText}>
  //           Vui lòng đăng nhập để xem và quản lý playlist
  //         </Text>
  //       </View>
  //     </View>
  //   );
  // }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Playlist của tôi</Text>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Cập nhật phần return JSX với UI được tối ưu
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={COLORS.background}
        barStyle="dark-content"
        translucent={true}
      />
      <View style={styles.container}>
        {/* Header gọn gàng hơn */}
        <View style={styles.header}>
          <Text style={styles.title}>Playlist của tôi</Text>
        </View>

        {/* Danh sách các section */}
        <FlatList
          data={[...userPlaylists]}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => (
            <>
              {/* Thẻ yêu thích được thiết kế lại */}
              <TouchableOpacity
                style={styles.favoriteCard}
                onPress={() => router.push("/favoritePlaylist/_favPlaylist")}
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
                <Icon
                  name="chevron-right"
                  size={26}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {/* Section title */}
              <Text style={styles.sectionTitle}>Playlist của bạn</Text>

              {/* Hiển thị trạng thái rỗng nếu không có playlist */}
              {userPlaylists.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Icon
                    name="queue-music"
                    size={60}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.emptyText}>
                    Bạn chưa có playlist nào. Tạo playlist đầu tiên ngay!
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyCreateButton}
                    onPress={() => {
                      setEditingPlaylist(null);
                      setNewPlaylistName("");
                      setNewPlaylistDesc("");
                      setSelectedCoverImg(null);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.emptyCreateButtonText}>
                      Tạo playlist
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistItem}
              onPress={() =>
                router.push({
                  pathname: "/playlist/[id]",
                  params: { id: item.id },
                })
              }
            >
              <Image
                source={{ uri: item.coverImg }}
                style={styles.playlistCover}
              />
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
          )}
          contentContainerStyle={{
            paddingBottom: miniPlayerHeight ? miniPlayerHeight + 80 : 100, // Tăng padding để tránh bị MiniPlayer che
            gap: 12, // Khoảng cách giữa các item
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={null}
        />

        {/* FAB (Floating Action Button) với vị trí được điều chỉnh */}
        <TouchableOpacity
          style={[
            styles.fab,
            { bottom: miniPlayerHeight ? miniPlayerHeight + 20 : 30 },
          ]}
          onPress={() => {
            setEditingPlaylist(null);
            setNewPlaylistName("");
            setNewPlaylistDesc("");
            setSelectedCoverImg(null);
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Icon name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>

        {/* Các modal giữ nguyên */}
        {renderModal()}
        {renderOptionsModal()}

        {/* Player giữ nguyên */}
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
  favoriteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: SIZES.md,
    marginBottom: SIZES.md,
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
  // actionButton: {
  //   flex: 1,
  //   borderRadius: 8,
  //   padding: 14,
  //   alignItems: "center",
  //   justifyContent: "center",
  //   height: 50,
  // },
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

  // Các style khác giữ nguyên
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
    // Thêm style cho header container
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hoverBg,
  },
});
