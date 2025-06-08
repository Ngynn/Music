import React from "react";
import { View, ActivityIndicator, StyleSheet, Modal, Text } from "react-native";

interface LoadingProps {
  visible: boolean; // Trạng thái hiển thị loading
  message?: string; // Thông báo tùy chọn
}

export default function Loading({ visible, message }: LoadingProps) {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1DB954" />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  loadingBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
});
