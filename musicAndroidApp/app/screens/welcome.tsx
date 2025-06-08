import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import React from "react";
import { COLORS, SIZES } from "../constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import "../../firebaseConfig";

export default function Welcome() {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />

      <LinearGradient
        colors={[COLORS.primary + "80", COLORS.background]}
        style={styles.gradient}
      />

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>MOCHA</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Âm nhạc không giới hạn</Text>
        <Text style={styles.subtitle}>
          Trải nghiệm âm nhạc yêu thích bất cứ lúc nào, bất cứ nơi đâu
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/screens/signIn")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push("/screens/signUp")}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Đăng ký
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Hãy tham gia cùng hàng triệu người nghe nhạc khác
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: StatusBar.currentHeight || 0,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: SIZES.sm,
    borderRadius: SIZES.xl,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.text,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.xl,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SIZES.xl * 2,
    lineHeight: 22,
  },
  buttonContainer: {
    width: "100%",
    gap: SIZES.md,
    marginBottom: SIZES.xl,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.primary,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: SIZES.md,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  footerText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xl,
  },
});
