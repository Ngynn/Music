import React, { createContext, useContext, useState } from "react";
import CustomAlert, { AlertOption } from "../components/CustomAlert";

// Định nghĩa interface cho context
interface AlertContextType {
  showAlert: (title: string, message?: string, options?: AlertOption[]) => void;
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => void;
  prompt: (title: string, message: string, actions: AlertOption[]) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  hideAlert: () => void;
}

// Tạo context với giá trị mặc định
const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
  confirm: () => {},
  prompt: () => {},
  success: () => {},
  error: () => {},
  hideAlert: () => {},
});

// Hook để sử dụng alert context
export const useAlert = () => useContext(AlertContext);

// Provider Component
export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [options, setOptions] = useState<AlertOption[]>([]);
  const [type, setType] = useState<
    "default" | "success" | "error" | "warning" | "info"
  >("default");

  // Hiển thị alert với các options tùy chỉnh
  const showAlert = (
    title: string,
    message: string = "",
    options: AlertOption[] = [{ text: "OK" }]
  ) => {
    setTitle(title);
    setMessage(message);
    setOptions(options);
    setVisible(true);
  };

  // Đóng alert
  const hideAlert = () => {
    setVisible(false);
  };

  // Hiển thị alert xác nhận
  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert(title, message, [
      {
        text: "Hủy",
        style: "cancel",
        onPress: onCancel,
      },
      {
        text: "Đồng ý",
        style: "default",
        onPress: onConfirm,
      },
    ]);
  };

  // Hiển thị alert với nhiều tùy chọn
  const prompt = (title: string, message: string, actions: AlertOption[]) => {
    showAlert(title, message, actions);
  };

  // Hiển thị thông báo thành công
  const success = (title: string, message: string = "") => {
    showAlert(title, message, [
      {
        text: "OK",
        icon: "check-circle",
      },
    ]);
  };

  // Hiển thị thông báo lỗi
  const error = (title: string, message: string = "") => {
    showAlert(title, message, [
      {
        text: "Đóng",
        style: "destructive",
        icon: "error",
      },
    ]);
  };

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        confirm,
        prompt,
        success,
        error,
        hideAlert,
      }}
    >
      {children}
      <CustomAlert
        visible={visible}
        title={title}
        message={message}
        options={options}
        onClose={hideAlert}
        // type={type}
      />
    </AlertContext.Provider>
  );
};

export default function AlertContextComponent() {
  // Đây là một component giả để thỏa mãn yêu cầu default export
  return null;
}
