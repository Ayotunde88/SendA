import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../../theme/styles";
import { saveBasicInfo } from "../../../api/config";

export default function BasicInfoScreen() {
  const router = useRouter();

  const [first, setFirst] = useState("");
  const [middle, setMiddle] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");

  const [dob, setDob] = useState<Date | null>(null);

  // Android picker uses this boolean
  const [showAndroidDate, setShowAndroidDate] = useState(false);

  // iOS picker inside a modal (so user can tap Done)
  const [showIOSDate, setShowIOSDate] = useState(false);
  const [tempDob, setTempDob] = useState<Date>(new Date(2000, 1, 9));

  const [showProtectModal, setShowProtectModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDob = (d: Date | null) => {
    if (!d) return "";
    const day = d.getDate();
    const month = d.toLocaleString("en-GB", { month: "long" });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const age = useMemo(() => {
    if (!dob) return null;
    const now = new Date();
    let a = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a -= 1;
    return a;
  }, [dob]);

  const isAdult = age === null ? false : age >= 18;

  const canContinue = useMemo(() => {
    const ok = !!(first.trim() && last.trim() && email.trim() && dob);
    return ok && isAdult;
  }, [first, last, email, dob, isAdult]);

  const ageText = useMemo(() => {
    if (age === null) return null;
    return `This makes you ${age} years`;
  }, [age]);

  const openDatePicker = () => {
    if (Platform.OS === "ios") {
      setTempDob(dob || new Date(2000, 1, 9));
      setShowIOSDate(true);
    } else {
      setShowAndroidDate(true);
    }
  };

  const handleProceed = async () => {
    setShowProtectModal(false);
    setLoading(true);

    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (!phone) {
        Alert.alert("Error", "Phone number not found");
        return;
      }

      if (!dob) {
        Alert.alert("Error", "Please select your date of birth");
        return;
      }

      const result = await saveBasicInfo(phone, {
        first_name: first.trim(),
        middle_name: middle.trim() ? middle.trim() : undefined,
        last_name: last.trim(),
        email: email.trim().toLowerCase(),
        date_of_birth: dob.toISOString().split("T")[0],
      });

      if (result?.success) {
        router.push("/protectpassword");
        await AsyncStorage.setItem("user_info", JSON.stringify({
          first_name: first.trim(),
          middle_name: middle.trim() ? middle.trim() : undefined,
          last_name: last.trim(),
          email: email.trim().toLowerCase(),
          date_of_birth: dob.toISOString().split("T")[0],
        }));
      } else {
        Alert.alert("Error", result?.message || "Failed to save info");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.shell}>
        {/* Top row */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <Pressable style={styles.getHelpPill}>
            <Text style={styles.getHelpPillText}>Get help</Text>
          </Pressable>
        </View>

        {/* Progress line */}
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>

        <Text style={[styles.bigTitle, { marginTop: 18 }]}>Basic information</Text>

        {/* Yellow info box */}
        <View style={styles.yellowInfo}>
          <Text style={styles.yellowInfoText}>
            Enter your full legal name exactly as it appears on your government issued ID, no initials.
          </Text>
        </View>

        {/* First + Middle */}
        <View style={styles.twoColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>First name</Text>
            <View style={styles.inputBox}>
              <TextInput value={first} onChangeText={setFirst} style={styles.input} />
            </View>
          </View>

          <View style={{ width: 12 }} />

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Middle name (optional)</Text>
            <View style={styles.inputBox}>
              <TextInput value={middle} onChangeText={setMiddle} style={styles.input} />
            </View>
          </View>
        </View>

        {/* Last */}
        <Text style={[styles.label, { marginTop: 16 }]}>Last name</Text>
        <View style={styles.inputBox}>
          <TextInput value={last} onChangeText={setLast} style={styles.input} />
        </View>

        {/* Email */}
        <Text style={[styles.label, { marginTop: 16 }]}>Email address</Text>
        <View style={styles.inputBox}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* DOB */}
        <Text style={[styles.label, { marginTop: 16 }]}>Date of birth</Text>
        <Pressable style={styles.dobBox} onPress={openDatePicker}>
          <Text style={[styles.input, { color: dob ? "#1E1E1E" : "#B8B8B8" }]}>
            {dob ? formatDob(dob) : "Select date"}
          </Text>
          <Text style={styles.calendarIcon}>📅</Text>
        </Pressable>

        {/* info line */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>ⓘ</Text>
          <Text style={styles.infoText}>
            {dob ? ageText : "You must be 18 or over to use LemFi"}
          </Text>
        </View>

        {!isAdult && dob ? (
          <Text style={{ marginTop: 6, color: "#C23B3B", fontWeight: "600" }}>
            You must be 18 or over to continue.
          </Text>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable
          style={canContinue && !loading ? styles.primaryBtn : styles.disabledBigBtn}
          // onPress={() => {
          //   if (!canContinue || loading) return;
            
          //   setShowProtectModal(true);
          // }}
          onPress={handleProceed}
          disabled={loading}
        >
          <Text style={canContinue && !loading ? styles.primaryBtnText : styles.disabledBigBtnText}>
            Continue
          </Text>
        </Pressable>

        {/* ANDROID Date picker */}
        {showAndroidDate && Platform.OS !== "ios" && (
          <DateTimePicker
            value={dob || new Date(2000, 1, 9)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selected) => {
              setShowAndroidDate(false);
              // dismissed on Android
              if (event.type === "dismissed") return;
              setDob(selected || null);
            }}
          />
        )}

        {/* iOS date modal */}
        <Modal visible={showIOSDate} transparent animationType="fade">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowIOSDate(false)}
          >
            <Pressable
              style={[styles.sheet, { padding: 16, paddingBottom: 16 }]}
              onPress={() => {}}
            >
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setShowIOSDate(false)} style={styles.sheetClose}>
                  <Text style={{ fontSize: 18 }}>✕</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>Select date</Text>
                <Pressable
                  onPress={() => {
                    setDob(tempDob);
                    setShowIOSDate(false);
                  }}
                  style={{ padding: 6 }}
                >
                  <Text style={{ fontWeight: "800", color: "#2FBF71" }}>Done</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={tempDob}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, selected) => {
                  if (selected) setTempDob(selected);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>

        {/* Protect modal */}
        <Modal
          transparent
          visible={showProtectModal}
          animationType="fade"
          onRequestClose={() => setShowProtectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setShowProtectModal(false)} />

            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setShowProtectModal(false)} style={styles.sheetClose}>
                  <Text style={{ fontSize: 18 }}>✕</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>Protect Your Account</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={{ alignItems: "center", marginTop: 10 }}>
                <Text style={{ fontSize: 40 }}>🤝</Text>
              </View>

              <Text style={styles.sheetText}>
                Your bank or other financial institutions will never call you and ask you to open a LemFi account
              </Text>

              <Pressable
                style={[styles.primaryBtn, { marginTop: 18, opacity: loading ? 0.6 : 1, alignItems: "center", justifyContent: "center", }]}
                onPress={handleProceed}
                disabled={loading}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? "Saving..." : "Proceed"}
                </Text>
              </Pressable>
            </View>

            <Pressable style={{ flex: 1 }} onPress={() => setShowProtectModal(false)} />
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
