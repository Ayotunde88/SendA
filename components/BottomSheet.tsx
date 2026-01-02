import React from "react";
import { Modal, View, Pressable, Text, TouchableWithoutFeedback } from "react-native";
import { styles } from "../theme/styles";
interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
export default function BottomSheet({ open, onClose, children }: Props) {
  return (
    <Modal visible={open} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetBackdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetContainer}>
        <View style={styles.sheet}>
          <Pressable style={styles.sheetClose} onPress={onClose}>
            <Text style={{ fontSize: 16 }}>✕</Text>
          </Pressable>
          {children}
        </View>
      </View>
    </Modal>
  );
}
