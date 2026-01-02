import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TextInput } from "react-native";
import { COLORS } from "../theme/colors";
import { styles } from "../theme/styles";

export type Region = { code: string; name: string };

type Props = {
  label: string;               // "State" or "Province"
  value: Region | null;
  onChange: (region: Region) => void;
  regions: Region[];           // list for the selected country
};

export default function RegionDropdown({ label, value, onChange, regions }: Props) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return regions;
    return regions.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
    );
  }, [regions, search]);

  const pick = (r: Region) => {
    onChange(r);
    setVisible(false);
    setSearch("");
  };

  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>

      <Pressable style={styles.inputBox} onPress={() => setVisible(true)}>
        <Text style={{ flex: 1, color: value ? COLORS.text : "#B3B3B3", fontSize: 16 }}>
          {value ? value.name : `Select ${label.toLowerCase()}`}
        </Text>
        <Text style={{ fontSize: 18, color: COLORS.text }}>⌄</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <Pressable onPress={() => setVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
              <Text style={styles.title}>Select {label}</Text>
              <View style={{ width: 30 }} />
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${label.toLowerCase()}...`}
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
            />

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const selected = value?.code === item.code;
                return (
                  <Pressable
                    onPress={() => pick(item)}
                    style={[styles.item, selected && styles.itemSelected]}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDialCode}>{item.code}</Text>
                    </View>
                    {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>No results</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
