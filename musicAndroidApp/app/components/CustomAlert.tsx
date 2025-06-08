import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { COLORS, SIZES } from "../constants/theme";
import Icon from "react-native-vector-icons/MaterialIcons";
import { BlurView } from "expo-blur"; // Thêm vào để tạo hiệu ứng blur

const { width } = Dimensions.get("window");

export interface AlertOption {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
  icon?: string;
}

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  options: AlertOption[];
  onClose: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  options,
  onClose,
}) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {Platform.OS === "ios" && (
          <BlurView
            intensity={30}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
        )}

        <View
          style={styles.alertContainer}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.alertHeader}>
            <Text style={styles.alertTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {message && <Text style={styles.alertMessage}>{message}</Text>}

          <ScrollView
            style={[
              styles.optionsContainer,
              options.length > 6 ? styles.scrollableOptions : undefined,
            ]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsContent}
          >
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionItem,
                  index === options.length - 1 && styles.lastOption,
                  option.style === "cancel" && styles.cancelOption,
                  option.style === "destructive" && styles.destructiveOption,
                ]}
                onPress={() => {
                  if (option.onPress) option.onPress();
                  onClose();
                }}
              >
                <View style={styles.optionContent}>
                  {option.icon && (
                    <View
                      style={[
                        styles.iconContainer,
                        option.style === "destructive" &&
                          styles.destructiveIconContainer,
                        option.style === "cancel" && styles.cancelIconContainer,
                      ]}
                    >
                      <Icon
                        name={option.icon}
                        size={18}
                        color={
                          option.style === "destructive"
                            ? COLORS.error
                            : option.style === "cancel"
                            ? COLORS.textSecondary
                            : COLORS.primary
                        }
                      />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      option.style === "destructive" && styles.destructiveText,
                      option.style === "cancel" && styles.cancelText,
                    ]}
                  >
                    {option.text}
                  </Text>
                </View>

                {/* {option.style !== "destructive" &&
                  option.style !== "cancel" && (
                    <Icon
                      name="chevron-right"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  )} */}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor:
      Platform.OS === "ios" ? "transparent" : "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  alertContainer: {
    width: "94%",
    maxWidth: 400,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: `${COLORS.hoverBg}60`,
  },
  alertMessage: {
    fontSize: 16,
    color: COLORS.text,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    lineHeight: 22,
  },
  optionsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  optionsContent: {
    paddingVertical: SIZES.sm,
  },
  scrollableOptions: {
    maxHeight: 320,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    marginVertical: 2,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${COLORS.primary}20`,
    marginRight: SIZES.sm,
  },
  cancelIconContainer: {
    backgroundColor: `${COLORS.hoverBg}60`,
  },
  destructiveIconContainer: {
    backgroundColor: `${COLORS.error}20`,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    fontWeight: "500",
    alignContent: "center",
  },
  cancelOption: {
    borderRadius: 12,
    backgroundColor: `${COLORS.hoverBg}40`,
    marginHorizontal: SIZES.sm,
  },
  cancelText: {
    color: COLORS.textSecondary,
  },
  destructiveOption: {
    borderRadius: 12,
    backgroundColor: `${COLORS.error}15`,
    marginHorizontal: SIZES.sm,
  },
  destructiveText: {
    color: COLORS.error,
    fontWeight: "600",
  },
});

export default CustomAlert;
