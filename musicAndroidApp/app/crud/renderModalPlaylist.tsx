import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS, SIZES } from "../constants/theme";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

const { width } = Dimensions.get("window");

interface RenderModalPlaylistProps {
  visible: boolean;
  onClose: () => void;
  songId?: string;
  songName?: string;
  songArtist?: string;
  songImage?: string;
  editingPlaylist?: any;
  onPlaylistCreated?: (playlistId: string) => void;
}

// Được dùng với menuOptions.tsx
// Để hiển thị modal tạo playlist mới hoặc chỉnh sửa playlist hiện có

const RenderModalPlaylist: React.FC<RenderModalPlaylistProps> = ({
  visible,
  onClose,
  songId,
  songName = "",
  songArtist = "",
  songImage = "",
  editingPlaylist = null,
  onPlaylistCreated,
}) => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState(
    editingPlaylist?.name || ""
  );
  const [newPlaylistDesc, setNewPlaylistDesc] = useState(
    editingPlaylist?.description || ""
  );
  const [selectedCoverImg, setSelectedCoverImg] = useState<string | null>(
    editingPlaylist?.coverImg || null
  );

  // Xử lý chọn ảnh
  const handleSelectCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedCoverImg(result.assets[0].uri);
    }
  };

  // Upload ảnh lên Cloudinary
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
        "https://api.cloudinary.com/v1_1/dfn3a005q/image/upload",
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

  // Xử lý tạo/cập nhật playlist
  const handleSavePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên playlist");
      return;
    }

    setIsLoading(true);

    try {
      let coverImgUrl = selectedCoverImg;

      if (
        selectedCoverImg &&
        !selectedCoverImg.startsWith("http") &&
        !selectedCoverImg.startsWith("https")
      ) {
        coverImgUrl = await uploadToCloudinary(selectedCoverImg);
      }

      const auth = getAuth();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        Alert.alert("Lỗi", "Bạn cần đăng nhập để tạo playlist");
        return;
      }

      if (editingPlaylist) {
        // Cập nhật playlist hiện có
        const playlistRef = doc(db, "playlists", editingPlaylist.id);
        await updateDoc(playlistRef, {
          name: newPlaylistName.trim(),
          description: newPlaylistDesc.trim(),
          coverImg: coverImgUrl || editingPlaylist.coverImg,
          updatedAt: serverTimestamp(),
        });

        onClose();

        if (onPlaylistCreated) {
          onPlaylistCreated(editingPlaylist.id);
        }
      } else {
        // Tạo playlist mới
        const newPlaylist = {
          name: newPlaylistName.trim(),
          description: newPlaylistDesc.trim(),
          coverImg:
            coverImgUrl ||
            "https://images.rawpixel.com/image_png_800/cHJpdmF0ZS9zci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA5L3JtNTgxLWVsZW1lbnQtMTA3LnBuZw.png",
          userId: userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Tạo playlist trước
        const docRef = await addDoc(collection(db, "playlists"), newPlaylist);

        // Nếu có bài hát để thêm vào
        if (songId) {
          // Thêm bài hát vào playlistSongs
          await addDoc(collection(db, "playlistSongs"), {
            playlistId: docRef.id,
            songId: songId,
            songName: songName,
            songArtist: songArtist,
            songImage: songImage,
            addedAt: serverTimestamp(),
          });
        }

        onClose();

        if (onPlaylistCreated) {
          onPlaylistCreated(docRef.id);
        } else {
          router.push({
            pathname: "/playlist/[id]",
            params: { id: docRef.id },
          });
        }
      }

      Alert.alert(
        "Thành công",
        editingPlaylist
          ? "Playlist đã được cập nhật!"
          : "Playlist đã được tạo thành công!"
      );
    } catch (error) {
      console.error("Lỗi khi xử lý playlist:", error);
      Alert.alert(
        "Lỗi",
        `Không thể ${
          editingPlaylist ? "cập nhật" : "tạo"
        } playlist. Vui lòng thử lại sau.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form khi đóng modal
  const handleClose = () => {
    if (!isLoading) {
      setNewPlaylistName("");
      setNewPlaylistDesc("");
      setSelectedCoverImg(null);
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPlaylist ? "Chỉnh sửa Playlist" : "Tạo Playlist Mới"}
            </Text>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Icon name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Ảnh bìa playlist */}
          <TouchableOpacity
            style={styles.coverImageContainer}
            onPress={handleSelectCoverImage}
            disabled={isLoading}
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
                editable={!isLoading}
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
                editable={!isLoading}
                maxLength={200}
              />
              <Text style={styles.charCount}>{newPlaylistDesc.length}/200</Text>
            </View>
          </View>

          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.confirmButton,
                (!newPlaylistName.trim() || isLoading) && styles.disabledButton,
              ]}
              onPress={handleSavePlaylist}
              disabled={!newPlaylistName.trim() || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingButtonContent}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.confirmButtonText}>
                    {editingPlaylist ? "Đang lưu..." : "Đang tạo..."}
                  </Text>
                </View>
              ) : (
                <Text style={styles.confirmButtonText}>
                  {editingPlaylist ? "Lưu thay đổi" : "Tạo mới"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
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
});

export default RenderModalPlaylist;
