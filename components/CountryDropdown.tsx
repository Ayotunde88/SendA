import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { getCountries } from "../api/config";
import { COLORS } from "../theme/colors";
import { styles } from "../theme/styles";
import CountryFlag from "./CountryFlag";

export interface Country {
  code: string;
  name: string;
  flag?: string;
  dialCode?: string;
}

interface Props {
  value: Country | null;
  onChange: (country: Country) => void;
}

export default function CountryDropdown({ value, onChange }: Props) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    getCountries()
      .then((data) => {
        if (mounted && data.length > 0) {
          setCountries(data);
          if (!value) {
            onChange(data[0]);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch countries:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCountries = useMemo(
    () =>
      countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          (c.dialCode ?? "").includes(search)
      ),
    [countries, search]
  );

  const handleSelect = (country: Country) => {
    onChange(country);
    setVisible(false);
    setSearch("");
  };

  if (!value) {
    return (
      <View style={styles.countryBox}>
        <CountryFlag size="md" fallbackEmoji="🏳️" />
        <Text style={styles.arrow}>▼</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable style={styles.countryBox} onPress={() => setVisible(true)}>
        <CountryFlag countryCode={value.code} fallbackEmoji={value.flag ?? "🏳️"} size="md" />
        <Text style={styles.arrow}>▼</Text>
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
              <Text style={styles.title}>Select Country</Text>
              <View style={{ width: 30 }} />
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search country..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.item,
                    item.code === value.code && styles.itemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <CountryFlag countryCode={item.code} fallbackEmoji={item.flag ?? "🏳️"} size="lg" />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDialCode}>{item.dialCode ?? ""}</Text>
                  </View>
                  {item.code === value.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No countries found</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}