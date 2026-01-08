import React, { useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TextInput, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";
import { styles } from "../theme/styles";

export interface Wallet {
  id: number;
  currencyCode: string;
  currencyName: string;
  countryName: string | null;
  flag: string;
  symbol: string;
  balance: number;
  formattedBalance: string;
  status: string;
}

interface CurrencyPickerModalProps {
  visible: boolean;
  onClose: () => void;
  wallets: Wallet[];
  selected: Wallet | null;
  onSelect: (wallet: Wallet) => void;
  title?: string;
}

export default function CurrencyPickerModal({
  visible,
  onClose,
  wallets,
  selected,
  onSelect,
  title = "Select Currency",
}: CurrencyPickerModalProps) {
  const [search, setSearch] = useState("");

  const filteredWallets = wallets.filter(
    (w) =>
      w.currencyCode.toLowerCase().includes(search.toLowerCase()) ||
      (w.countryName?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleSelect = (wallet: Wallet) => {
    if (wallet.status === "disabled") {
      // Could show alert here
      return;
    }
    onSelect(wallet);
    onClose();
    setSearch("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <View style={{ width: 30 }} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search currency..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />

          <FlatList
            data={filteredWallets}
            keyExtractor={(item) => item.currencyCode}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.item,
                  item.currencyCode === selected?.currencyCode && styles.itemSelected,
                  item.status === "disabled" && { opacity: 0.5 },
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.itemFlag}>{item.flag}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.currencyCode} - {item.countryName || item.currencyName}
                  </Text>
                  <Text style={styles.itemBalance}>
                    Balance: {item.formattedBalance}
                    {item.status === "disabled" && " (Disabled)"}
                  </Text>
                </View>
                {item.currencyCode === selected?.currencyCode && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No currencies found</Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}