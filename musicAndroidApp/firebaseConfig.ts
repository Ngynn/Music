import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants"; // dùng cho Expo EAS Build

const firebaseConfig = {
  // apiKey: Constants.manifest?.extra?.firebaseApiKey,
  // authDomain: Constants.manifest?.extra?.firebaseAuthDomain,
  // projectId: Constants.manifest?.extra?.firebaseProjectId,
  // storageBucket: Constants.manifest?.extra?.firebaseStorageBucket,
  // messagingSenderId: Constants.manifest?.extra?.firebaseMessagingSenderId,
  // appId: Constants.manifest?.extra?.firebaseAppId,
  // measurementId: Constants.manifest?.extra?.firebaseMeasurementId,
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
