import { COLORS } from "@/theme/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fundWithCard } from "../../../../api/paysafe";
import ScreenShell from "../../../../components/ScreenShell";
import { styles } from "../../../../theme/styles";

const SAVED_CARDS_KEY = "saved_cards_v1";

interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
}

function detectCardBrand(num: string): string {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  return "Card";
}

export default function AddMoneyCardScreen() {
  const [amount, setAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveCard, setSaveCard] = useState(false);

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const loadSavedCards = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_CARDS_KEY);
      if (raw) setSavedCards(JSON.parse(raw));
    } catch (e) {
      console.error("[AddMoneyCard] Failed to load saved cards:", e);
    }
  }, []);

  useEffect(() => {
    const loadUserInfo = async () => {
      const [phone, storedUser] = await Promise.all([
        AsyncStorage.getItem("user_phone"),
        AsyncStorage.getItem("user_info"),
      ]);
      if (phone) setUserPhone(phone);
      if (storedUser) {
        try {
          const userInfo = JSON.parse(storedUser);
          if (userInfo.email) setUserEmail(userInfo.email);
          const fullName = [userInfo.firstName || userInfo.first_name, userInfo.lastName || userInfo.last_name]
            .filter(Boolean).join(" ").trim();
          if (fullName && !cardholderName) setCardholderName(fullName);
        } catch (e) {
          console.error("[AddMoneyCard] Failed to parse user_info:", e);
        }
      }
    };
    loadUserInfo();
    loadSavedCards();
  }, []);

  useEffect(() => {
    // If no saved cards, show new card form automatically
    if (savedCards.length === 0) {
      setShowNewCardForm(true);
    }
  }, [savedCards]);

  const persistCards = async (cards: SavedCard[]) => {
    await AsyncStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(cards));
    setSavedCards(cards);
  };

  const handleSaveCard = async () => {
    const raw = cardNumber.replace(/\s/g, "");
    if (raw.length < 15) return;

    const newCard: SavedCard = {
      id: editingCardId || Date.now().toString(),
      last4: raw.slice(-4),
      brand: detectCardBrand(raw),
      cardholderName: cardholderName.trim(),
      expiryMonth,
      expiryYear,
    };

    let updated: SavedCard[];
    if (editingCardId) {
      updated = savedCards.map((c) => (c.id === editingCardId ? newCard : c));
      setEditingCardId(null);
    } else {
      updated = [...savedCards, newCard];
    }
    await persistCards(updated);
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert("Remove Card", "Are you sure you want to remove this saved card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const updated = savedCards.filter((c) => c.id !== cardId);
          await persistCards(updated);
          if (selectedCardId === cardId) {
            setSelectedCardId(null);
            setShowNewCardForm(updated.length === 0);
          }
        },
      },
    ]);
  };

  const handleEditCard = (card: SavedCard) => {
    setEditingCardId(card.id);
    setCardholderName(card.cardholderName);
    setExpiryMonth(card.expiryMonth);
    setExpiryYear(card.expiryYear);
    setCardNumber("");
    setCvv("");
    setSelectedCardId(null);
    setShowNewCardForm(true);
  };

  const selectSavedCard = (card: SavedCard) => {
    setSelectedCardId(card.id);
    setShowNewCardForm(false);
    setEditingCardId(null);
    setCardholderName(card.cardholderName);
    setExpiryMonth(card.expiryMonth);
    setExpiryYear(card.expiryYear);
    setCardNumber("");
    setCvv("");
  };

  const startNewCard = () => {
    setSelectedCardId(null);
    setEditingCardId(null);
    setShowNewCardForm(true);
    setCardNumber("");
    setCvv("");
    setExpiryMonth("");
    setExpiryYear("");
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleSubmit = async () => {
    if (!userPhone) {
      Alert.alert("Error", "User session not found. Please log in again.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // For saved card selection, user must enter full card number + CVV
    if (selectedCardId) {
      if (!cvv || cvv.length < 3) {
        Alert.alert("Error", "Please enter your CVV to continue");
        return;
      }
      if (cardNumber.replace(/\s/g, "").length < 15) {
        Alert.alert("Error", "Please re-enter your full card number for security");
        return;
      }
    } else {
      if (cardNumber.replace(/\s/g, "").length < 15) {
        Alert.alert("Error", "Please enter a valid card number");
        return;
      }
      if (!expiryMonth || !expiryYear) {
        Alert.alert("Error", "Please enter card expiry date");
        return;
      }
      if (cvv.length < 3) {
        Alert.alert("Error", "Please enter a valid CVV");
        return;
      }
      if (!cardholderName.trim()) {
        Alert.alert("Error", "Please enter the cardholder name");
        return;
      }
    }

    setLoading(true);
    try {
      const result = await fundWithCard({
        amount: parseFloat(amount),
        cardNumber: cardNumber.replace(/\s/g, ""),
        expiryMonth: parseInt(expiryMonth),
        expiryYear: parseInt(expiryYear),
        cvv,
        cardholderName: cardholderName.trim(),
        phone: userPhone,
        email: userEmail || undefined,
      });

      if (result.success) {
        // Save card if checkbox was checked (new card flow only)
        if (saveCard && !selectedCardId) {
          await handleSaveCard();
        }
        Alert.alert("Success", `$${amount} has been added to your account.`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", result.message || "Failed to process payment");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isUsingSavedCard = !!selectedCardId;

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Add Money with Card</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={localStyles.card}>
            <Text style={styles.inputLabel}>Amount (CAD)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          {/* Saved Cards */}
          {savedCards.length > 0 && (
            <View style={localStyles.card}>
              <Text style={styles.sectionTitle}>Saved Cards</Text>
              {savedCards.map((card) => (
                <Pressable
                  key={card.id}
                  style={[
                    localStyles.savedCardRow,
                    selectedCardId === card.id && localStyles.savedCardRowSelected,
                  ]}
                  onPress={() => selectSavedCard(card)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={localStyles.savedCardBrand}>
                      {card.brand} •••• {card.last4}
                    </Text>
                    <Text style={localStyles.savedCardDetail}>
                      {card.cardholderName} · {card.expiryMonth}/{card.expiryYear}
                    </Text>
                  </View>
                  <View style={localStyles.cardActions}>
                    <Pressable
                      onPress={() => handleEditCard(card)}
                      style={localStyles.cardActionBtn}
                      hitSlop={8}
                    >
                      <Text style={localStyles.cardActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteCard(card.id)}
                      style={localStyles.cardActionBtn}
                      hitSlop={8}
                    >
                      <Text style={[localStyles.cardActionText, { color: "#E53E3E" }]}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}

              {/* Re-enter card number + CVV for saved card */}
              {isUsingSavedCard && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Card Number</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="Re-enter full card number"
                    keyboardType="number-pad"
                    value={cardNumber}
                    onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                    maxLength={19}
                  />
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={[styles.inputBox, { width: 100 }]}
                    placeholder="123"
                    keyboardType="number-pad"
                    secureTextEntry
                    value={cvv}
                    onChangeText={(t) => setCvv(t.slice(0, 4))}
                    maxLength={4}
                  />
                </View>
              )}

              {!showNewCardForm && (
                <Pressable style={localStyles.addNewCardBtn} onPress={startNewCard}>
                  <Text style={localStyles.addNewCardText}>+ Use a different card</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* New / Edit Card Form */}
          {showNewCardForm && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {editingCardId ? "Edit Card" : "Card Details"}
              </Text>

              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="1234 5678 9012 3456"
                keyboardType="number-pad"
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                maxLength={19}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Expiry Month</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="MM"
                    keyboardType="number-pad"
                    value={expiryMonth}
                    onChangeText={(t) => setExpiryMonth(t.slice(0, 2))}
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Expiry Year</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="YY"
                    keyboardType="number-pad"
                    value={expiryYear}
                    onChangeText={(t) => setExpiryYear(t.slice(0, 2))}
                    maxLength={2}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>CVV</Text>
              <TextInput
                style={[styles.inputBox, { width: 100 }]}
                placeholder="123"
                keyboardType="number-pad"
                secureTextEntry
                value={cvv}
                onChangeText={(t) => setCvv(t.slice(0, 4))}
                maxLength={4}
              />

              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="John Doe"
                autoCapitalize="words"
                value={cardholderName}
                onChangeText={setCardholderName}
              />

              {/* Save card checkbox (new cards only) */}
              {!editingCardId && (
                <Pressable
                  style={localStyles.checkboxRow}
                  onPress={() => setSaveCard(!saveCard)}
                >
                  <View
                    style={[
                      localStyles.checkbox,
                      saveCard && localStyles.checkboxChecked,
                    ]}
                  >
                    {saveCard && <Text style={localStyles.checkmark}>✓</Text>}
                  </View>
                  <Text style={localStyles.checkboxLabel}>
                    Save this card for future payments
                  </Text>
                </Pressable>
              )}

              {/* Save edits button (edit mode only) */}
              {editingCardId && (
                <Pressable
                  style={[localStyles.addNewCardBtn, { marginTop: 12 }]}
                  onPress={async () => {
                    if (cardNumber.replace(/\s/g, "").length < 15) {
                      Alert.alert("Error", "Please enter a valid card number");
                      return;
                    }
                    await handleSaveCard();
                    setShowNewCardForm(false);
                  }}
                >
                  <Text style={localStyles.addNewCardText}>Save Changes</Text>
                </Pressable>
              )}
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, loading && styles.disabledBigBtn]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.black} />
            ) : (
              <Text style={styles.primaryBtnText}>
                Add ${amount || "0.00"} CAD
              </Text>
            )}
          </Pressable>

          <Text style={styles.secureText}>
            🔒 Your payment is secured by Paysafe
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const localStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  savedCardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginTop: 8,
    backgroundColor: "#FAFAFA",
  },
  savedCardRowSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  savedCardBrand: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A202C",
  },
  savedCardDetail: {
    fontSize: 13,
    color: "#718096",
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
  },
  cardActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
  },
  addNewCardBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  addNewCardText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#CBD5E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkmark: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#4A5568",
  },
});
