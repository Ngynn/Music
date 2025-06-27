import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS, SIZES } from "../constants/theme";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useFocusEffect } from "@react-navigation/native";
import { useAlert } from "../context/alertContext";

interface UserData {
  createdAt?: any;
  email?: string;
  name?: string;
  phoneNumber?: string;
  photoURL?: string;
  fullName?: string;
}

export default function Account() {
  const { success, error, confirm } = useAlert();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const router = useRouter();

  // dang xuat
  const handleSignOut = async () => {
    confirm(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?",
      async () => {
        try {
          await signOut(auth);
          success("Thông báo", "Đăng xuất thành công!");
          router.replace("/screens/signIn");
        } catch (err) {
          console.error("Lỗi khi đăng xuất:", err);
          error("Lỗi", "Đăng xuất thất bại, vui lòng thử lại.");
        }
      }
    );
  };

  // xem thong tin tai khoan
  const handleViewProfile = () => {
    if (!userData) {
      error("Thông báo", "Không có thông tin người dùng để hiển thị.");
      return;
    }
    router.push(
      `/screens/userProfile?userData=${encodeURIComponent(
        JSON.stringify(userData)
      )}`
    );
  };

  // lay thong tin user
  const fetchUserData = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserData(userDoc.data());
      } else {
        console.log("Không tìm thấy dữ liệu người dùng!");
      }
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu người dùng:", err);
      error("Lỗi", "Không thể tải thông tin người dùng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // kich hoat modal doi mat khau
  const handleChangePassword = () => {
    if (!auth.currentUser || !auth.currentUser.email) {
      error("Lỗi", "Vui lòng đăng nhập lại để thực hiện chức năng này");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalVisible(true);
  };

  // đổi mật khẩu
  const changePassword = async () => {
    if (newPassword.length < 6) {
      error("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      error("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      error("Lỗi", "Vui lòng đăng nhập lại để thực hiện chức năng này");
      return;
    }

    setChangingPassword(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      setPasswordModalVisible(false);
      success("Thành công", "Mật khẩu đã được thay đổi thành công");
    } catch (err: any) {
      let errorMessage = "Đã có lỗi xảy ra khi đổi mật khẩu";

      if (err.code === "auth/wrong-password") {
        errorMessage = "Mật khẩu hiện tại không đúng";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Quá nhiều yêu cầu. Vui lòng thử lại sau";
      } else if (err.code === "auth/requires-recent-login") {
        errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại";
        await signOut(auth);
        router.replace("/screens/signIn");
      }

      error("Lỗi", errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  // kich hoat modal about me
  const handleAboutMe = () => {
    setAboutModalVisible(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [])
  );

  // render modal doi password
  const renderPasswordModal = () => (
    <Modal
      visible={passwordModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setPasswordModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Thay đổi mật khẩu</Text>

          <View style={styles.inputContainer}>
            <Icon
              name="lock"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              placeholderTextColor={COLORS.textSecondary}
              editable={!changingPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <Icon
                name={showCurrentPassword ? "visibility" : "visibility-off"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Icon
              name="lock"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              placeholderTextColor={COLORS.textSecondary}
              editable={!changingPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Icon
                name={showNewPassword ? "visibility" : "visibility-off"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Icon
              name="lock"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor={COLORS.textSecondary}
              editable={!changingPassword}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon
                name={showConfirmPassword ? "visibility" : "visibility-off"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.modalButtonsContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setPasswordModalVisible(false)}
              disabled={changingPassword}
            >
              <Text style={styles.buttonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.saveButton,
                changingPassword && styles.disabledButton,
              ]}
              onPress={changePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Xác nhận</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // render modal about me
  const renderAboutModal = () => (
    <Modal
      visible={aboutModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setAboutModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Về ứng dụng</Text>

          <View style={styles.aboutContainer}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.aboutLogo}
              resizeMode="contain"
            />

            <Text style={styles.appName}>Music App</Text>
            <Text style={styles.versionText}>Phiên bản 1.0.0</Text>

            <Text style={styles.aboutText}>
              Ứng dụng nghe nhạc được phát triển bởi nhóm LTA, mang đến cho
              người dùng trải nghiệm nghe nhạc tuyệt vời với nhiều tính năng hữu
              ích.
            </Text>

            <Text style={styles.developerTitle}>Nhóm phát triển:</Text>
            <View style={styles.developerItem}>
              <Icon name="person" size={16} color={COLORS.primary} />
              <Text style={styles.developerText}>Nguyễn Long</Text>
            </View>
            <View style={styles.developerItem}>
              <Icon name="person" size={16} color={COLORS.primary} />
              <Text style={styles.developerText}>Đăng Khoa</Text>
            </View>
            <View style={styles.developerItem}>
              <Icon name="person" size={16} color={COLORS.primary} />
              <Text style={styles.developerText}>Kỳ Anh</Text>
            </View>
            <View style={styles.developerItem}>
              <Icon name="person" size={16} color={COLORS.primary} />
              <Text style={styles.developerText}>Cẩm Tiên</Text>
            </View>

            <View style={styles.contactContainer}>
              <Text style={styles.contactText}>Liên hệ: 0903618126</Text>
              <View style={styles.socialIcons}>
                <TouchableOpacity style={styles.socialIcon}>
                  <Icon name="mail" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}>
                  <Icon name="phone" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon}>
                  <Icon name="public" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalButton, styles.closeButton]}
            onPress={() => setAboutModalVisible(false)}
          >
            <Text style={styles.buttonText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={COLORS.background}
        barStyle="dark-content"
        translucent={true}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.profileContainer}>
          <Image
            source={{
              uri: userData?.photoURL || "https://via.placeholder.com/150",
            }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>
            {userData?.fullName || "Người dùng"}
          </Text>
          <Text style={styles.profileEmail}>
            {userData?.email || "Email không xác định"}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleViewProfile}
          >
            <Icon
              name="person"
              size={22}
              color={COLORS.text}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Xem thông tin cá nhân</Text>
            <Icon name="chevron-right" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={handleChangePassword}
          >
            <Icon
              name="lock"
              size={22}
              color={COLORS.text}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Thay đổi mật khẩu</Text>
            <Icon name="chevron-right" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={handleAboutMe}>
            <Icon
              name="info"
              size={22}
              color={COLORS.text}
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Về tôi</Text>
            <Icon name="chevron-right" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.logoutButton]}
            onPress={handleSignOut}
          >
            <Icon
              name="exit-to-app"
              size={22}
              color="#fff"
              style={styles.optionIcon}
            />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {renderPasswordModal()}
        {renderAboutModal()}
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
    padding: SIZES.md,
    alignItems: "center",
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: SIZES.xl,
    paddingVertical: SIZES.lg,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SIZES.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileName: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  profileEmail: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  optionsContainer: {
    width: "100%",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    padding: SIZES.md,
    borderRadius: 8,
    marginBottom: SIZES.sm,
  },
  optionIcon: {
    marginRight: SIZES.sm,
  },
  optionText: {
    flex: 1,
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    marginTop: SIZES.md,
  },
  logoutText: {
    flex: 1,
    fontSize: SIZES.md,
    fontWeight: "600",
    color: "#fff",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SIZES.lg,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 50,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    marginBottom: SIZES.md,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  passwordToggle: {
    padding: 8,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: SIZES.md,
  },
  modalButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.cardBg,
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    marginTop: SIZES.md,
    width: "100%",
  },
  buttonText: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  saveButtonText: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.white,
  },
  disabledButton: {
    opacity: 0.7,
  },

  aboutContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: SIZES.md,
  },
  aboutLogo: {
    width: 80,
    height: 80,
    marginBottom: SIZES.md,
  },
  appName: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  versionText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  aboutText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SIZES.md,
    lineHeight: 20,
  },
  developerTitle: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    alignSelf: "flex-start",
    marginBottom: SIZES.xs,
  },
  developerItem: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: SIZES.xs,
  },
  developerText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginLeft: SIZES.xs,
  },
  contactContainer: {
    width: "100%",
    marginTop: SIZES.md,
  },
  contactText: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  socialIcons: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SIZES.xs,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: SIZES.xs,
  },
});
