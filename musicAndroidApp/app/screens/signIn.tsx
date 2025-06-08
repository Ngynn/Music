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
  Alert,
  ScrollView,
} from "react-native";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";
import { COLORS, SIZES } from "../constants/theme";
import Icon from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Loading from "../loading/loading"; // Đảm bảo bạn đã import đúng component Loading

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    // Validate input
    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }

    if (!password) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu");
      return;
    }

    setLoading(true);
    try {
      // Đăng nhập người dùng
      await signInWithEmailAndPassword(auth, email, password);
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

      Alert.alert("Lỗi đăng nhập", errorMessage);
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

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
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

      <Loading visible={loading} message="Đang đăng nhập..." />
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
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
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
});
