import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  // Alert, // Xóa import Alert
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { router } from "expo-router";
import { COLORS, SIZES } from "../constants/theme";
import Icon from "react-native-vector-icons/MaterialIcons";
import Loading from "../loading/loading";
import { LinearGradient } from "expo-linear-gradient";
import { useAlert } from "../context/alertContext"; // Thêm import useAlert

export default function SignUp() {
  const { success, error, confirm } = useAlert();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    if (!fullName.trim()) {
      error("Lỗi", "Vui lòng nhập họ và tên");
      return false;
    }

    if (!email.trim()) {
      error("Lỗi", "Vui lòng nhập email");
      return false;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      error("Lỗi", "Email không hợp lệ");
      return false;
    }

    if (!phoneNumber.trim()) {
      error("Lỗi", "Vui lòng nhập số điện thoại");
      return false;
    }

    if (password.length < 6) {
      error("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }

    if (password !== confirmPassword) {
      error("Lỗi", "Mật khẩu xác nhận không khớp");
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Tạo tài khoản người dùng
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const { uid } = userCredential.user;

      // Tạo document trong Firestore
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, {
        email,
        role: "user",
        createdAt: serverTimestamp(),
        phoneNumber,
        fullName,
        photoURL:
          "https://miro.medium.com/v2/resize:fit:720/1*W35QUSvGpcLuxPo3SRTH4w.png",
      });

      success(
        "Đăng ký thành công",
        "Tài khoản của bạn đã được tạo thành công!"
      );
    } catch (e: any) {
      let errorMessage = "Đăng ký không thành công";

      if (e.code === "auth/email-already-in-use") {
        errorMessage = "Email này đã được sử dụng";
      } else if (e.code === "auth/invalid-email") {
        errorMessage = "Email không hợp lệ";
      } else if (e.code === "auth/weak-password") {
        errorMessage = "Mật khẩu quá yếu";
      }

      // Thay thế Alert.alert bằng error
      error("Lỗi đăng ký", errorMessage);
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
      {/* <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" /> */}
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
          <Text style={styles.title}>Tạo tài khoản mới</Text>
          <Text style={styles.subtitle}>
            Đăng ký để bắt đầu khám phá thế giới âm nhạc
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon
              name="person"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

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
              name="phone"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
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

          <View style={styles.inputContainer}>
            <Icon
              name="lock"
              size={20}
              color={COLORS.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor={COLORS.textSecondary}
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

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </Text>
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              Bằng cách đăng ký, bạn đồng ý với{" "}
              <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{" "}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text> của chúng
              tôi
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Đã có tài khoản?{" "}
            <Text
              style={styles.footerLink}
              onPress={() => router.push("/screens/signIn")}
            >
              Đăng nhập
            </Text>
          </Text>
        </View>
      </ScrollView>

      <Loading visible={loading} message="Đang đăng ký..." />
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
    marginBottom: SIZES.xl,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
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
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.md,
    paddingVertical: SIZES.md,
    alignItems: "center",
    marginTop: SIZES.sm,
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
  termsContainer: {
    marginTop: SIZES.lg,
  },
  termsText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
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
});
