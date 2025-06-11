import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS, SIZES } from "../constants/theme";

export default function UserProfile() {
  const { userData } = useLocalSearchParams();
  const router = useRouter();

  // Phân tích userData từ params
  const [parsedData, setParsedData] = useState<{
    fullName: string;
    email: string;
    phoneNumber: string;
  } | null>(null);

  // Các state hooks
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Hàm fetch dữ liệu người dùng từ Firestore
  const fetchUserData = async () => {
    try {
      if (!auth.currentUser?.uid) {
        console.error("Không tìm thấy ID người dùng hiện tại");
        return;
      }

      setIsLoading(true);
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFullName(userData.fullName || "");
        setEmail(userData.email || "");
        setPhoneNumber(userData.phoneNumber || "");

        // Cập nhật parsedData để khi hủy sẽ reset về giá trị mới nhất
        setParsedData({
          fullName: userData.fullName || "",
          email: userData.email || "",
          phoneNumber: userData.phoneNumber || "",
        });
      } else {
        console.error("Không tìm thấy dữ liệu người dùng");
      }
    } catch (error) {
      console.error("Lỗi khi lấy thông tin người dùng:", error);
      Alert.alert(
        "Lỗi",
        "Không thể tải thông tin người dùng. Vui lòng thử lại sau."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Khi component mount, lấy dữ liệu người dùng ban đầu từ params
  useEffect(() => {
    try {
      if (typeof userData === "string") {
        const parsed = JSON.parse(decodeURIComponent(userData));
        setParsedData(parsed);
        // Đồng thời thiết lập userId từ auth nếu có
        if (auth.currentUser?.uid) {
          setUserId(auth.currentUser.uid);
        }
      } else {
        Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng.");
        router.back();
      }
    } catch (error) {
      console.error("Lỗi khi phân tích dữ liệu người dùng:", error);
      Alert.alert("Lỗi", "Không thể đọc thông tin người dùng.");
      router.back();
    }
  }, [userData]);

  // Cập nhật state từ parsedData khi nó thay đổi
  useEffect(() => {
    if (parsedData) {
      setFullName(parsedData.fullName || "");
      setEmail(parsedData.email || "");
      setPhoneNumber(parsedData.phoneNumber || "");
    }
  }, [parsedData]);

  // useEffect để fetch dữ liệu mỗi khi userId thay đổi hoặc sau khi cập nhật thông tin
  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]); // Chỉ phụ thuộc vào userId để tránh vòng lặp vô hạn

  // Cập nhật hàm handleSave để refreshData sau khi save thành công
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ và tên");
      return;
    }

    try {
      setIsLoading(true);
      const userDocRef = doc(db, "users", auth.currentUser?.uid || "");
      await updateDoc(userDocRef, {
        fullName,
        email,
        phoneNumber,
      });

      // Sau khi cập nhật thành công, fetch lại dữ liệu mới nhất
      await fetchUserData();

      Alert.alert("Thành công", "Thông tin cá nhân đã được cập nhật!");
      setIsEditing(false);
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin cá nhân:", error);
      Alert.alert(
        "Lỗi",
        "Không thể cập nhật thông tin cá nhân. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Họ và tên</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="person"
            size={20}
            color={COLORS.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nhập họ và tên"
            placeholderTextColor={COLORS.textSecondary}
            editable={isEditing}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="email"
            size={20}
            color={COLORS.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={email}
            onChangeText={setEmail}
            placeholder="Nhập email"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            editable={isEditing}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Số điện thoại</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="phone"
            size={20}
            color={COLORS.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Nhập số điện thoại"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
            editable={isEditing}
          />
        </View>
      </View>

      {/* Action Buttons */}
      {isEditing ? (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setFullName(parsedData?.fullName || "");
              setEmail(parsedData?.email || "");
              setPhoneNumber(parsedData?.phoneNumber || "");
              setIsEditing(false);
            }}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(true)}
          activeOpacity={0.7}
        >
          <Icon
            name="edit"
            size={20}
            color={COLORS.white}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.editButtonText}>Chỉnh sửa thông tin</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render the main component
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={COLORS.background}
        barStyle="light-content"
        translucent={true}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Thông tin cá nhân</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Form Content */}
        {renderForm()}
      </ScrollView>
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
  contentContainer: {
    flexGrow: 1,
    padding: SIZES.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SIZES.md,
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.lg,
    paddingVertical: SIZES.xs,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  formContainer: {
    marginTop: SIZES.md,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    paddingVertical: 14,
    fontSize: SIZES.md,
  },
  inputDisabled: {
    color: COLORS.textSecondary,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SIZES.lg,
  },
  cancelButton: {
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.hoverBg,
  },
  cancelButtonText: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.white,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SIZES.lg,
    flexDirection: "row",
  },
  editButtonText: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.white,
  },
  disabledButton: {
    opacity: 0.7,
  },
});
