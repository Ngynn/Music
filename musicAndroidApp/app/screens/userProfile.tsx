import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
import { useAlert } from "../context/alertContext";

export default function UserProfile() {
  const { userData } = useLocalSearchParams();
  const router = useRouter();
  const { success, error, confirm } = useAlert();

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
    } catch (err) {
      console.error("Lỗi khi lấy thông tin người dùng:", err);
      error(
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
        error("Lỗi", "Không tìm thấy thông tin người dùng.");
        router.back();
      }
    } catch (err) {
      console.error("Lỗi khi phân tích dữ liệu người dùng:", err);
      error("Lỗi", "Không thể đọc thông tin người dùng.");
      router.back();
    }
  }, [userData, error, router]);

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
  }, [userId]);

  // kiem tra, luu va cap nhat lai du lieu nguoi dung
  const handleSave = async () => {
    if (!fullName.trim()) {
      error("Lỗi", "Vui lòng nhập họ và tên");
      return;
    }

    if (email && !isValidEmail(email)) {
      error("Lỗi", "Email không hợp lệ");
      return;
    }

    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      error("Lỗi", "Số điện thoại không hợp lệ");
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

      success("Thành công", "Thông tin cá nhân đã được cập nhật!");
      setIsEditing(false);
    } catch (err) {
      console.error("Lỗi khi cập nhật thông tin cá nhân:", err);
      error(
        "Lỗi",
        "Không thể cập nhật thông tin cá nhân. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhoneNumber = (phone: string) => {
    const phoneRegex = /^[\+]?[0-9\-\(\)\s]{10,15}$/;
    return phoneRegex.test(phone);
  };

  const handleCancel = () => {
    // Kiểm tra xem có thay đổi gì không
    const hasChanges =
      fullName !== (parsedData?.fullName || "") ||
      email !== (parsedData?.email || "") ||
      phoneNumber !== (parsedData?.phoneNumber || "");

    if (hasChanges) {
      // Nếu có thay đổi, hiển thị confirm dialog
      confirm(
        "Xác nhận",
        "Bạn có thay đổi chưa được lưu. Bạn có muốn hủy bỏ những thay đổi này?",
        () => {
          // Nếu người dùng xác nhận hủy
          setFullName(parsedData?.fullName || "");
          setEmail(parsedData?.email || "");
          setPhoneNumber(parsedData?.phoneNumber || "");
          setIsEditing(false);
        }
      );
    } else {
      // Nếu không có thay đổi, thoát luôn
      setIsEditing(false);
    }
  };

  // render form hien thi va sua thong tin ca nhan
  const renderForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Họ và tên *</Text>
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
            maxLength={50}
          />
        </View>
        {isEditing && (
          <Text style={styles.charCount}>{fullName.length}/50</Text>
        )}
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
            placeholder="Nhập email (tùy chọn)"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="email-address"
            editable={isEditing}
            autoCapitalize="none"
            maxLength={100}
          />
        </View>
        {isEditing && (
          <Text style={styles.charCount}>{email.length}/100</Text>
        )}
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
            placeholder="Nhập số điện thoại (tùy chọn)"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
            editable={isEditing}
            maxLength={15}
          />
        </View>
        {isEditing && (
          <Text style={styles.charCount}>{phoneNumber.length}/15</Text>
        )}
      </View>

      {/* Action Buttons */}
      {isEditing ? (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Icon
              name="close"
              size={20}
              color={COLORS.text}
              style={{ marginRight: 8 }}
            />
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
              <>
                <Icon
                  name="save"
                  size={20}
                  color={COLORS.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
              </>
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
        keyboardShouldPersistTaps="handled"
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

        {/* **FIX 15: Thêm loading overlay khi đang xử lý** */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang xử lý...</Text>
          </View>
        )}
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
  // **FIX 16: Thêm loading overlay style**
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
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
    borderWidth: 1,
    borderColor: "transparent",
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
  // **FIX 17: Thêm style cho character count**
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SIZES.lg,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: COLORS.cardBg,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.hoverBg,
    flexDirection: "row",
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
    flexDirection: "row",
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
