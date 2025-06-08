import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  // Alert, // Xóa import Alert
  Switch,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES } from "../constants/theme";
import { router } from "expo-router";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getAuth, signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAlert } from "../context/alertContext"; // Thêm import useAlert

const SettingsScreen = () => {
  // Sử dụng hook useAlert
  const { confirm, prompt, success, error } = useAlert();

  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  const auth = getAuth();

  useEffect(() => {
    // Lấy thông tin người dùng khi component mount
    const fetchUserInfo = async () => {
      try {
        if (auth.currentUser) {
          setUserName(
            auth.currentUser.displayName || auth.currentUser.email || "Admin"
          );

          // Nếu bạn lưu role trong AsyncStorage hoặc user claims
          const role = await AsyncStorage.getItem("userRole");
          setUserRole(role || "Admin");
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
        error("Lỗi", "Không thể tải thông tin người dùng");
      }
    };

    fetchUserInfo();
  }, []);

  // Xử lý notification toggle với thông báo
  const handleNotificationToggle = (value: any) => {
    setNotificationsEnabled(value);
    if (value) {
      success("Thông báo", "Đã bật thông báo");
    } else {
      success("Thông báo", "Đã tắt thông báo");
    }
  };

  // Xử lý dark mode toggle với thông báo
  const handleDarkModeToggle = (value: any) => {
    setDarkModeEnabled(value);
    if (value) {
      success("Giao diện", "Đã chuyển sang chế độ tối");
    } else {
      success("Giao diện", "Đã chuyển sang chế độ sáng");
    }
  };

  const handleLogout = async () => {
    confirm("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", async () => {
      setIsLoading(true);
      try {
        await signOut(auth);
        // Xóa thông tin đăng nhập từ AsyncStorage nếu có
        await AsyncStorage.removeItem("userToken");
        await AsyncStorage.removeItem("userRole");

        // Chuyển về trang đăng nhập
        router.replace("/screens/signIn");
      } catch (err) {
        console.error("Error signing out:", err);
        error("Lỗi", "Đã xảy ra lỗi khi đăng xuất. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    });
  };

  // Hiển thị màn hình loading khi đang xử lý đăng xuất
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang đăng xuất...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cài đặt</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Section */}
        <View style={styles.section}>
          <View style={styles.userInfoContainer}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {userName ? userName[0].toUpperCase() : "A"}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userRole}>{userRole}</Text>
            </View>
          </View>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt chung</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Icon name="notifications" size={24} color={COLORS.text} />
              <Text style={styles.settingItemText}>Thông báo</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: "#767577", true: `${COLORS.primary}80` }}
              thumbColor={notificationsEnabled ? COLORS.primary : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Icon name="nightlight-round" size={24} color={COLORS.text} />
              <Text style={styles.settingItemText}>Chế độ tối</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: "#767577", true: `${COLORS.primary}80` }}
              thumbColor={darkModeEnabled ? COLORS.primary : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
            />
          </View>
        </View>

        {/* Admin Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản trị viên</Text>

          {/* <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push("/screens/adminStats")}
          >
            <View style={styles.settingItemLeft}>
              <Icon name="bar-chart" size={24} color={COLORS.text} />
              <Text style={styles.settingItemText}>Thống kê hệ thống</Text>
            </View>
            <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push("/screens/adminUsers")}
          >
            <View style={styles.settingItemLeft}>
              <Icon name="people" size={24} color={COLORS.text} />
              <Text style={styles.settingItemText}>Quản lý người dùng</Text>
            </View>
            <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity> */}

          {/* <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push("/screens/adminBackup")}
          >
            <View style={styles.settingItemLeft}>
              <Icon name="backup" size={24} color={COLORS.text} />
              <Text style={styles.settingItemText}>Sao lưu dữ liệu</Text>
            </View>
            <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity> */}
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>

          {/* <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push("/screens/changePassword")}
          >
            <View style={styles.settingItemLeft}>
              <Icon name="lock" size={24} color={COLORS.text} />
              <Text style={styles.settingItemText}>Đổi mật khẩu</Text>
            </View>
            <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity> */}

          <TouchableOpacity
            style={[styles.settingItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <View style={styles.settingItemLeft}>
              <Icon name="logout" size={24} color={COLORS.error} />
              <Text style={[styles.settingItemText, styles.logoutText]}>
                Đăng xuất
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin ứng dụng</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phiên bản</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Bản quyền</Text>
            <Text style={styles.infoValue}>© 2023 Music App</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  userInitial: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
  },
  userDetails: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingItemText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 16,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: "500",
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default SettingsScreen;
