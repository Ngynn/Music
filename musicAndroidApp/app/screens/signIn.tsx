import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Modal,
} from "react-native";
import { auth } from "../../firebaseConfig";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useRouter } from "expo-router";
import { COLORS, SIZES } from "../constants/theme";
import Icon from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Loading from "../loading/loading";
import { useAlert } from "../context/alertContext";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const router = useRouter();

  const { success, error, confirm } = useAlert();

  // xu ly dang nhap
  const handleSignIn = async () => {
    // Validate input
    if (!email.trim()) {
      error("Lỗi", "Vui lòng nhập email");
      return;
    }

    if (!password) {
      error("Lỗi", "Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);
    try {
      // Đăng nhập người dùng
      await signInWithEmailAndPassword(auth, email, password);
      success("Thành công", "Đăng nhập thành công!");
      // Redirect đến trang chính sau khi đăng nhập thành công
    } catch (e: any) {
      // Hiển thị lỗi đăng nhập chi tiết
      let errorMessage = "Đăng nhập không thành công";

      if (e.code === "auth/user-not-found") {
        errorMessage = "Email không tồn tại";
      } else if (e.code === "auth/wrong-password") {
        errorMessage = "Mật khẩu không chính xác";
      } else if (e.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ";
      } else if (e.code === "auth/too-many-requests") {
        errorMessage =
          "Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau.";
      }

      error("Lỗi đăng nhập", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // xu ly quên mật khẩu
  const handleForgotPassword = () => {
    if (email.trim()) {
      // Nếu có email, confirm trực tiếp
      confirm(
        "Đặt lại mật khẩu",
        `Gửi email đặt lại mật khẩu đến:\n${email}?`,
        () => sendResetEmail(email)
      );
    } else {
      // Nếu chưa có email, mở modal
      setResetEmail("");
      setShowForgotPasswordModal(true);
    }
  };

  // xu ly event submit trong modal quên mật khẩu
  const handleModalSubmit = () => {
    if (!resetEmail.trim()) {
      error("Lỗi", "Vui lòng nhập email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      error("Lỗi", "Email không hợp lệ");
      return;
    }

    setShowForgotPasswordModal(false);
    sendResetEmail(resetEmail);
  };

  // gui email đặt lại mật khẩu
  const sendResetEmail = async (emailAddress: string) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      error("Lỗi", "Email không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailAddress);

      success(
        "Thành công",
        `Email đặt lại mật khẩu đã được gửi đến:\n${emailAddress}\n\nVui lòng kiểm tra hộp thư của bạn (bao gồm cả thư mục spam).`
      );

      // Nếu email trong modal chưa được nhập, cập nhật state để hiển thị
      if (!email.trim()) {
        setEmail(emailAddress);
      }
    } catch (e: any) {
      console.error("Password reset error:", e);

      let errorMessage = "Không thể gửi email đặt lại mật khẩu";

      if (e.code === "auth/user-not-found") {
        errorMessage = "Email này chưa được đăng ký trong hệ thống";
      } else if (e.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ";
      } else if (e.code === "auth/too-many-requests") {
        errorMessage = "Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.";
      } else if (e.code === "auth/quota-exceeded") {
        errorMessage = "Đã vượt quá giới hạn gửi email. Vui lòng thử lại sau.";
      }

      error("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <LinearGradient
        colors={[COLORS.primary + "80", COLORS.background]}
        style={styles.gradient}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/screens/welcome")}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>
            Đăng nhập để tiếp tục thưởng thức âm nhạc yêu thích của bạn
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon
              name="email"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textSecondary}
            />
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
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={COLORS.textSecondary}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Icon
                name={showPassword ? "visibility" : "visibility-off"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* quen mat khau */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text
              style={[
                styles.forgotPasswordText,
                loading && { opacity: 0.5 }, // Làm mờ khi loading
              ]}
            >
              Quên mật khẩu?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Không có tài khoản?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/screens/signUp")}
            >
              Đăng ký
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* modal forgot password */}
      <Modal
        visible={showForgotPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đặt lại mật khẩu</Text>
              <TouchableOpacity
                onPress={() => setShowForgotPasswordModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMessage}>
              Nhập email để nhận liên kết đặt lại mật khẩu:
            </Text>

            <View style={styles.modalInputContainer}>
              <Icon
                name="email"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowForgotPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleModalSubmit}
                disabled={loading}
              >
                <Icon
                  name="send"
                  size={18}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.confirmButtonText}>
                  {loading ? "Đang gửi..." : "Gửi"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Loading visible={loading} message="Đang xử lý..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SIZES.xl,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: SIZES.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    marginBottom: SIZES.md,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: SIZES.xl * 2,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: SIZES.md,
    borderRadius: SIZES.xl,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginHorizontal: SIZES.md,
  },
  formContainer: {
    width: "100%",
    marginBottom: SIZES.xl,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: SIZES.md,
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.sm,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.hoverBg,
  },
  inputIcon: {
    marginRight: SIZES.sm,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
    height: "100%",
  },
  passwordToggle: {
    padding: SIZES.sm,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: SIZES.lg,
    padding: SIZES.xs,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: "500",
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.md,
    paddingVertical: SIZES.md,
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: SIZES.md,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingVertical: SIZES.lg,
  },
  footerText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: SIZES.md,
    width: "100%",
    maxWidth: 400,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.sm,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: "bold",
    color: COLORS.text,
  },
  closeButton: {
    padding: SIZES.xs,
  },
  modalMessage: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
    lineHeight: 22,
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: SIZES.sm,
    marginHorizontal: SIZES.lg,
    paddingHorizontal: SIZES.sm,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.hoverBg,
    marginBottom: SIZES.lg,
  },
  modalInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
    height: "100%",
  },
  modalButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.hoverBg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: COLORS.hoverBg,
  },
  confirmButton: {
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  confirmButtonText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: SIZES.xs,
  },
});
