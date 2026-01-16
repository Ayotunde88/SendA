import React from "react";
import { Modal, View, Pressable, Text } from "react-native";
import { styles } from "../theme/styles";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function BottomSheet({ open, onClose, children, title = "" }: Props) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ✅ same pattern as your first modal: overlay press closes */}
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        {/* ✅ prevent overlay close when tapping inside sheet */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* ✅ Header like your first modal */}
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} style={styles.sheetCloseBtn} hitSlop={12}>
              <Text style={styles.sheetCloseText}>✕</Text>
            </Pressable>

            <Text style={styles.sheetTitle} numberOfLines={1}>
              {title}
            </Text>

            {/* spacer keeps title centered */}
            <View style={{ width: 30 }} />
          </View>

          {/* Content */}
          <View style={styles.sheetContent}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
