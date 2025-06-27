import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";
import { View, Platform, StatusBar } from "react-native";
import { COLORS, SIZES } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FontAwesomeIconNames =
  | "home"
  | "search"
  | "music"
  | "star"
  | "user"
  | "bars"
  | "heart"
  | "list"
  | "gear";

type MaterialIconNames =
  | "home"
  | "search"
  | "library-music"
  | "equalizer"
  | "person"
  | "settings"
  | "favorite"
  | "playlist-play";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const getTabBarHeight = () => {
    if (Platform.OS === "android") {
      return 60 + insets.bottom;
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
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarIconStyle: {
          marginTop: 3,
          marginBottom: Platform.OS === "android" ? 2 : 0,
        },
        tabBarShowLabel: true,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="home"
              color={color}
              focused={focused}
              type="material"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Tìm kiếm",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="search"
              color={color}
              focused={focused}
              type="material"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="playlists"
        options={{
          title: "Thư viện",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="library-music"
              type="material"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{
          title: "BXH",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="equalizer"
              type="material"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="person"
              type="material"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

// Update component props with union types
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
