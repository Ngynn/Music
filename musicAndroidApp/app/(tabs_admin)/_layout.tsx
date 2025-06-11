import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";
import { View, Platform } from "react-native";
import { COLORS } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Define valid FontAwesome icon names
type FontAwesomeIconNames = "home" | "user" | "plus" | "cog" | "list" | "music";

// Define valid MaterialIcons icon names
type MaterialIconNames =
  | "home"
  | "person"
  | "add"
  | "settings"
  | "list"
  | "music-note"
  | "queue-music"
  | "playlist-add";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Đảm bảo tab bar nằm trên thanh cử chỉ
  const getTabBarHeight = () => {
    // Tăng height lên rõ rệt cho Android
    if (Platform.OS === "android") {
      return 60 + insets.bottom; // Tăng thêm để đảm bảo không bị che
    }
    return 60 + insets.bottom;
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.cardBg,
          borderTopWidth: 0,
          elevation: 8,
          height: getTabBarHeight(),
          paddingBottom:
            Platform.OS === "android" ? insets.bottom + 10 : insets.bottom,
          paddingTop: 5,
          paddingHorizontal: 10,
          zIndex: 8,
          position: "relative",
        },
        // Điều chỉnh vị trí của label
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        // Điều chỉnh vị trí của icon
        tabBarIconStyle: {
          marginTop: 3,
          marginBottom: Platform.OS === "android" ? 2 : 0,
        },
        tabBarShowLabel: true,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="manage"
        options={{
          title: "Quản lý",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="list"
              color={color}
              focused={focused}
              type="material"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="settings"
              color={color}
              focused={focused}
              type="material"
            />
          ),
        }}
      />
    </Tabs>
  );
}

// Component for tab bar icons with highlight effect
function TabBarIcon({
  name,
  color,
  focused,
  type = "material",
}: {
  name: string;
  color: string;
  focused: boolean;
  type?: "fontawesome" | "material";
}) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 50, // Đủ rộng để tạo hiệu ứng highlight xung quanh
        height: 30,
        backgroundColor: focused ? `${COLORS.primary}20` : "transparent", // Màu nền nhẹ khi được chọn
        borderRadius: 15,
      }}
    >
      {type === "fontawesome" ? (
        <FontAwesomeIcon
          name={name as FontAwesomeIconNames}
          color={color}
          focused={focused}
        />
      ) : (
        <MaterialIconComponent
          name={name as MaterialIconNames}
          color={color}
          focused={focused}
        />
      )}
    </View>
  );
}

// Component for FontAwesome icons
function FontAwesomeIcon({
  name,
  color,
  focused,
}: {
  name: FontAwesomeIconNames;
  color: string;
  focused: boolean;
}) {
  return (
    <FontAwesome
      size={focused ? 26 : 22}
      name={name}
      color={color}
      style={{
        opacity: focused ? 1 : 0.8,
      }}
    />
  );
}

// Component for Material icons
function MaterialIconComponent({
  name,
  color,
  focused,
}: {
  name: MaterialIconNames;
  color: string;
  focused: boolean;
}) {
  return (
    <MaterialIcons
      size={focused ? 26 : 22}
      name={name}
      color={color}
      style={{
        opacity: focused ? 1 : 0.8,
      }}
    />
  );
}
