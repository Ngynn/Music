import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { COLORS } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconName = "list" | "settings";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const tabBarHeight = 60 + insets.bottom;
  const paddingBottom =
    Platform.OS === "android" ? insets.bottom + 10 : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.cardBg,
          borderTopWidth: 0,
          elevation: 8,
          height: tabBarHeight,
          paddingBottom,
          paddingTop: 8,
          paddingHorizontal: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="manage"
        options={{
          title: "Quản lý",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="list" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: TabIconName;
  color: string;
  focused: boolean;
}) {
  const iconSize = focused ? 26 : 24;
  const opacity = focused ? 1 : 0.7;

  return (
    <MaterialIcons
      name={name}
      size={iconSize}
      color={color}
      style={{ opacity }}
    />
  );
}
