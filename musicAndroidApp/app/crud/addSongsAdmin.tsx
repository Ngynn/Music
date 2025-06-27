import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Button,
  Text,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { COLORS } from "../constants/theme";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function AddSong() {
  const [name, setName] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>("");

  const DEFAULT_IMAGE = "https://via.placeholder.com/150";

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Cần quyền truy cập",
            "Ứng dụng cần quyền truy cập thư viện media để chọn hình ảnh và âm thanh."
          );
        }
      }
    })();
  }, []);

  // Tối ưu hàm chọn file MP3 với kiểm tra định dạng và kích thước
  const handlePickFile = async () => {
    setIsLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/mpeg",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Kiểm tra xem có phải file MP3 không
        const fileType = file.mimeType || "";
        if (!fileType.includes("audio/")) {
          Alert.alert(
            "Định dạng không hỗ trợ",
            "Vui lòng chọn file âm thanh (MP3)"
          );
          setIsLoading(false);
          return;
        }

        setFileUri(file.uri);
        setFileName(file.name);

        // Kiểm tra kích thước file
        if (file.size !== undefined) {
          const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
          setFileSize(`${fileSizeInMB} MB`);

          if (file.size > 20 * 1024 * 1024) {
            Alert.alert(
              "File quá lớn",
              `File có kích thước ${fileSizeInMB}MB có thể gây khó khăn khi upload và phát trực tuyến. Bạn có muốn tiếp tục?`,
              [
                {
                  text: "Chọn file khác",
                  onPress: () => {
                    setFileUri(null);
                    setFileName(null);
                    setFileSize(null);
                    handlePickFile();
                  },
                  style: "cancel",
                },
                { text: "Tiếp tục", style: "default" },
              ]
            );
          } else {
            Alert.alert(
              "Đã thêm file thành công",
              `Tên: ${file.name}\nKích thước: ${fileSizeInMB} MB`
            );
          }
        } else {
          setFileSize("Không xác định");
          Alert.alert("Đã thêm file thành công", `Tên: ${file.name}`);
        }
      } else {
        Alert.alert("Không có file", "Bạn chưa chọn file nào");
      }
    } catch (error) {
      console.error("Lỗi khi chọn file:", error);
      Alert.alert("Lỗi", "Không thể chọn file");
    } finally {
      setIsLoading(false);
    }
  };

  // Tối ưu hàm chọn hình ảnh với chất lượng tốt hơn
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Tỷ lệ hình ảnh vuông cho ảnh bìa
        quality: 0.8, // Chất lượng tối ưu (0.8 thay vì 1 để giảm kích thước)
        exif: false, // Không lấy metadata EXIF để giảm kích thước
      });

      if (!result.canceled) {
        setImgUri(result.assets[0].uri);

        const asset = result.assets[0];
        if (asset.width && asset.height) {
          if (asset.width < 300 || asset.height < 300) {
            Alert.alert(
              "Hình ảnh có độ phân giải thấp",
              "Nên sử dụng hình ảnh có kích thước tối thiểu 500x500 để hiển thị tốt nhất",
              [{ text: "OK" }]
            );
          } else {
            Alert.alert(
              "Đã chọn hình ảnh thành công",
              "Hình ảnh sẽ được sử dụng làm ảnh bìa cho bài hát"
            );
          }
        } else {
          Alert.alert("Đã chọn hình ảnh thành công");
        }
      }
    } catch (error) {
      console.error("Lỗi khi chọn hình ảnh:", error);
      Alert.alert("Lỗi", "Không thể chọn hình ảnh");
    }
  };

  // Phần upload MP3 lên Cloudinary
  const handleAddSong = async () => {
    if (!name || !fileUri || !genre) {
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập đầy đủ tên bài hát, chọn file MP3 và thể loại"
      );
      return;
    }

    // Kiểm tra kích thước file - giới hạn 10MB/file
    if (fileSize) {
      const sizeInMB = parseFloat(fileSize.replace(" MB", ""));
      if (sizeInMB > 20) {
        Alert.alert(
          "File quá lớn",
          "Phiên bản chỉ hỗ trợ file tối đa 20MB. Vui lòng chọn file nhỏ hơn.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    setIsLoading(true);
    setIsUploading(true);

    try {
      // 1. Xử lý tên file (loại bỏ ký tự đặc biệt)
      const safeFileName = name.replace(/[^a-zA-Z0-9_]/g, "_");

      // 2. Upload file MP3 lên Cloudinary
      setCurrentAction("Đang tải file âm thanh lên máy chủ...");
      const formData = new FormData();

      formData.append("file", {
        uri:
          Platform.OS === "android" ? fileUri : fileUri.replace("file://", ""),
        type: "audio/mpeg",
        name: `${safeFileName}.mp3`,
      } as any);

      formData.append("upload_preset", "mp3_unsigned");

      formData.append("resource_type", "auto");

      formData.append("public_id", `songs/${safeFileName}`); // Chỉ định ID công khai để dễ quản lý

      // Upload với theo dõi tiến trình và xử lý lỗi cẩn thận
      try {
        const response = await axios.post(
          "https://api.cloudinary.com/v1_1/dfn3a005q/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const audioUrl = response.data.secure_url;

        // 3. Upload hình ảnh
        let imgUrl = DEFAULT_IMAGE;
        if (imgUri) {
          setCurrentAction("Đang tải hình ảnh bìa lên máy chủ...");

          const imgFormData = new FormData();
          imgFormData.append("file", {
            uri:
              Platform.OS === "android"
                ? imgUri
                : imgUri.replace("file://", ""),
            type: "image/jpeg",
            name: `${safeFileName}_cover.jpg`,
          } as any);

          imgFormData.append("upload_preset", "mp3_unsigned");
          imgFormData.append("public_id", `covers/${safeFileName}`);

          try {
            const imgResponse = await axios.post(
              "https://api.cloudinary.com/v1_1/dfn3a005q/upload",
              imgFormData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );

            imgUrl = imgResponse.data.secure_url;
          } catch (imgError: any) {
            console.error("Lỗi upload hình ảnh:", imgError);

            Alert.alert(
              "Lỗi hình ảnh",
              "Không thể tải lên hình ảnh. Bài hát sẽ sử dụng hình ảnh mặc định.",
              [{ text: "OK" }]
            );
          }
        }

        // 4. Lưu thông tin bài hát vào Firestore với metadata cơ bản
        setCurrentAction("Đang lưu thông tin bài hát...");
        await addDoc(collection(db, "song"), {
          name,
          audio: audioUrl,
          artist: artist || "Unknown Artist",
          album: album || "Single",
          genre,
          releaseYear: releaseYear || new Date().getFullYear().toString(),
          img: imgUrl,
          createdAt: new Date(),
          views: 0,
          likes: 0,
        });

        // 5. Thông báo thành công và reset form
        Alert.alert("Thành công", "Bài hát đã được thêm vào thư viện");
        setName("");
        setArtist("");
        setAlbum("");
        setGenre("");
        setReleaseYear("");
        setFileUri(null);
        setImgUri(null);
        setFileName(null);
        setFileSize(null);

        router.push("../manage");
      } catch (uploadError: any) {
        console.error("Lỗi upload:", uploadError);

        let errorMessage = "Không thể upload file lên máy chủ.";
        let errorDetails = "";

        if (uploadError.response) {
          console.error(
            "Response data:",
            JSON.stringify(uploadError.response.data, null, 2)
          );

          if (uploadError.response.data && uploadError.response.data.error) {
            if (typeof uploadError.response.data.error === "object") {
              errorDetails =
                uploadError.response.data.error.message ||
                JSON.stringify(uploadError.response.data.error);
            } else {
              errorDetails = uploadError.response.data.error;
            }
          } else if (uploadError.response.status === 400) {
            errorDetails =
              "Yêu cầu không hợp lệ. Kiểm tra kích thước file và định dạng.";
          } else if (uploadError.response.status === 401) {
            errorDetails = "Không có quyền upload. Kiểm tra upload_preset.";
          } else if (uploadError.response.status === 404) {
            errorDetails = "API URL không chính xác.";
          } else if (uploadError.response.status === 413) {
            errorDetails = "File quá lớn cho giới hạn máy chủ.";
          } else if (uploadError.response.status >= 500) {
            errorDetails = "Lỗi máy chủ Cloudinary. Vui lòng thử lại sau.";
          }
        } else if (uploadError.message) {
          if (uploadError.message.includes("Network Error")) {
            errorDetails =
              "Lỗi kết nối mạng. Kiểm tra kết nối internet của bạn.";
          } else {
            errorDetails = uploadError.message;
          }
        }

        Alert.alert(
          "Lỗi Upload",
          `${errorMessage}\n\nChi tiết: ${errorDetails}\n\nVui lòng kiểm tra kích thước file (<10MB) và thử lại.`
        );
      }
    } catch (error: any) {
      console.error("Lỗi tổng quát:", error);
      Alert.alert(
        "Lỗi",
        "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau."
      );
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      setCurrentAction("");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS?.background || "#f5f5f5" }}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={COLORS?.text || "#000"} />
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm bài hát mới</Text>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tên bài hát *</Text>
          <TextInput
            placeholder="Nhập tên bài hát"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nghệ sĩ</Text>
          <TextInput
            placeholder="Nhập tên nghệ sĩ"
            value={artist}
            onChangeText={setArtist}
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Album</Text>
          <TextInput
            placeholder="Nhập tên album"
            value={album}
            onChangeText={setAlbum}
            style={styles.input}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Thể loại *</Text>
          <View style={styles.pickerContainer}>
            {Platform.OS === "ios" ? (
              <Picker
                selectedValue={genre}
                onValueChange={(itemValue: string) => setGenre(itemValue)}
                style={styles.picker}
                itemStyle={{ fontSize: 16, height: 120 }}
              >
                <Picker.Item label="Chọn thể loại" value="" />
                <Picker.Item label="Rap" value="Rap" />
                <Picker.Item label="Ballad" value="Ballad" />
                <Picker.Item label="Pop" value="Pop" />
                <Picker.Item label="Rock" value="Rock" />
                <Picker.Item label="Jazz" value="Jazz" />
                <Picker.Item label="EDM" value="EDM" />
              </Picker>
            ) : (
              <Picker
                selectedValue={genre}
                onValueChange={(itemValue: string) => setGenre(itemValue)}
                style={styles.androidPicker}
                dropdownIconColor={COLORS?.text || "#000"}
                mode="dropdown"
              >
                <Picker.Item label="Chọn thể loại" value="" />
                <Picker.Item label="Rap" value="Rap" />
                <Picker.Item label="Ballad" value="Ballad" />
                <Picker.Item label="Pop" value="Pop" />
                <Picker.Item label="Rock" value="Rock" />
                <Picker.Item label="Jazz" value="Jazz" />
                <Picker.Item label="EDM" value="EDM" />
              </Picker>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Năm phát hành</Text>
          <TextInput
            placeholder="Nhập năm phát hành"
            value={releaseYear}
            onChangeText={setReleaseYear}
            keyboardType="numeric"
            style={styles.input}
            placeholderTextColor="#999"
            maxLength={4}
          />
        </View>

        {/* File MP3 */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>File MP3 *</Text>
          <TouchableOpacity
            style={styles.fileButton}
            onPress={handlePickFile}
            disabled={isLoading}
          >
            <Text style={styles.fileButtonText}>Chọn file MP3</Text>
          </TouchableOpacity>

          {fileName && (
            <View style={styles.fileInfoContainer}>
              <Text style={styles.fileInfo}>File: {fileName}</Text>
              {fileSize && (
                <Text style={styles.fileInfo}>Kích thước: {fileSize}</Text>
              )}
            </View>
          )}
        </View>

        {/* Hình ảnh */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Hình ảnh</Text>
          <TouchableOpacity
            style={styles.fileButton}
            onPress={handlePickImage}
            disabled={isLoading}
          >
            <Text style={styles.fileButtonText}>Chọn hình ảnh</Text>
          </TouchableOpacity>

          <View style={styles.imagePreview}>
            <Image
              source={{ uri: imgUri || DEFAULT_IMAGE }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!name || !fileUri || !genre || isLoading) && styles.disabledButton,
          ]}
          onPress={handleAddSong}
          disabled={!name || !fileUri || !genre || isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? "Đang xử lý..." : "Thêm bài hát"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Overlay -- lỗi % */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={COLORS?.primary || "#1DB954"}
            />
            <Text style={styles.loadingText}>
              {currentAction || "Đang xử lý..."}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginTop: Platform.OS === "android" ? 15 : 0,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 25 : 0,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS?.divider || "#ddd",
    backgroundColor: COLORS?.cardBg || "#fff",
  },
  backButton: {
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
    color: COLORS?.text || "#000",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS?.text || "#000",
    flex: 1,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: COLORS?.text || "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS?.cardBg || "#fff",
    color: COLORS?.text || "#000",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: COLORS?.cardBg || "#fff",

    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: Platform.OS === "ios" ? 8 : 0,
  },
  picker: {
    color: COLORS?.text || "#000",
    width: "100%",
    height: Platform.OS === "ios" ? 180 : 50,

    ...Platform.select({
      ios: {
        inputIOS: {
          paddingVertical: 12,
          paddingHorizontal: 10,
        },
      },
      android: {
        inputAndroid: {
          paddingHorizontal: 10,
          paddingVertical: 8,
        },
      },
    }),
  },
  androidPicker: {
    color: COLORS?.text || "#000",
    width: "100%",
    height: 50,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
    fontStyle: "italic",
  },
  fileButton: {
    backgroundColor: COLORS?.primary || "#1DB954",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  fileButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  fileInfoContainer: {
    backgroundColor: COLORS?.cardBg || "#f7f7f7",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  fileInfo: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  imagePreview: {
    marginTop: 10,
    alignItems: "center",
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: "#e0e0e0",
  },
  submitButton: {
    backgroundColor: COLORS?.primary || "#1DB954",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingContainer: {
    backgroundColor: COLORS?.cardBg || "#fff",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    width: "80%",
    maxWidth: 300,
  },
  loadingText: {
    marginTop: 15,
    color: COLORS?.text || "#000",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
});
