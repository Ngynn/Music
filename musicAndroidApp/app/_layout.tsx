import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { View, ActivityIndicator, Platform } from "react-native";
import React from "react";
import { AudioProvider } from "./context/audioContext";
import { AlertProvider } from "./context/alertContext"; // Thêm import này
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null); //  Thêm state role

  const router = useRouter();
  const segments = useSegments();

  const onAuthStateChangedHandler = async (user: User | null) => {
    // console.log("onAuthStateChanged", user);
    setUser(user);

    if (user) {
      try {
        const db = getFirestore(); // Lấy Firestore instance
        const userDocRef = doc(db, "users", user.uid); // Thay thế collection().doc()
        const userDoc = await getDoc(userDocRef); // Thay thế doc().get()
        const data = userDoc.data();
        if (data?.role) {
          setRole(data.role); // 👈 Gán role
        } else {
          setRole("user"); // 👈 fallback
        }
      } catch (error) {
        console.log("Error fetching role:", error);
        setRole("user"); // fallback
      }
    } else {
      setRole(null);
    }

    if (initializing) setInitializing(false);
  };

  useEffect(() => {
    const auth = getAuth(); // Lấy instance của Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, onAuthStateChangedHandler);
    return unsubscribe; // Hủy đăng ký listener khi component bị unmount
  }, []);

  useEffect(() => {
    if (initializing || role === null) return;

    const inAuthGroup =
      segments[0] === "(tabs)" || segments[0] === "(tabs_admin)";

    if (user && !inAuthGroup) {
      if (role === "admin") {
        router.replace("/(tabs_admin)/manage");
      } else {
        router.replace("/(tabs)/home");
      }
    } else if (!user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, role, initializing]);

  if (initializing)
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <AudioProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                // paddingBottom: Platform.OS === "android" ? 1 : 10,
              },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="screens/signIn"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="screens/signUp"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="screens/welcome"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(tabs_admin)"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* <Stack.Screen name="playlist" options={{ headerShown: false }} /> */}
          </Stack>
        </AudioProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}
