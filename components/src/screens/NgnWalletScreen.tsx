import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import ScreenShell from "./../../ScreenShell";
import WalletAction from "./../../WalletAction";
import DetailRow from "./../../DetailRow";
import { styles } from "../../../theme/styles";
import { cadWalletTx } from "../data/MockData";

export default function NgnWalletScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("Transactions");

  return (
    <ScreenShell>
      <View style={styles.centerHeader}>
        <Text style={styles.flagBig}>🇨🇦</Text>
        <Text style={styles.walletTitle}>CAD balance</Text>
        <Text style={styles.walletAmount}>0 CAD</Text>

        <Pressable style={styles.limitsPill}>
          <Text style={{ marginRight: 8 }}>🪙</Text>
          <Text style={{ fontWeight: "800", color: "#2D2D2D" }}>View account limits</Text>
        </Pressable>

        <View style={styles.walletActionRow}>
          <WalletAction icon="↑" label="Send" onPress={() => router.push("/sendmoney")} />
          <WalletAction icon="＋" label="Add" onPress={() => router.push("/addmoneymethods")} />
          <WalletAction icon="－" label="Withdraw" onPress={() => {}} />
          <WalletAction icon="↻" label="Convert" onPress={() => router.push("/convert")} />
        </View>

        <View style={styles.pillTabs}>
          <Pressable
            style={[styles.pillTab, tab === "Transactions" && styles.pillTabActive]}
            onPress={() => setTab("Transactions")}
          >
            <Text style={[styles.pillTabText, tab === "Transactions" && styles.pillTabTextActive]}>
              Transactions
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pillTab, tab === "Account" && styles.pillTabActive]}
            onPress={() => setTab("Account")}
          >
            <Text style={[styles.pillTabText, tab === "Account" && styles.pillTabTextActive]}>
              Account details
            </Text>
          </Pressable>
        </View>
      </View>

      {tab === "Transactions" ? (
        <View style={{ marginTop: 12 }}>
          {cadWalletTx.map((group, idx) => (
            <View key={idx} style={{ marginBottom: 18 }}>
              <Text style={styles.groupDate}>{group.date}</Text>
              <View style={styles.groupLine} />
              {group.items.map((t, i) => (
                <View key={i} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View style={styles.txIcon}>
                      <Text>💱</Text>
                    </View>
                    <View>
                      <Text style={styles.txTitle}>{t.title}</Text>
                      <Text style={styles.txTime}>{t.time}</Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={styles.txAmt}>{t.right}</Text>
                    {!!t.subRight && <Text style={styles.txSubAmt}>{t.subRight}</Text>}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: 18 }}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <View style={styles.detailsCard}>
            <DetailRow k="Account name" v="Your Name" />
            <DetailRow k="Currency" v="CAD" />
            <DetailRow k="Status" v="Active" />
            <DetailRow k="Limits" v="View account limits" />
          </View>
        </View>
      )}
    </ScreenShell>
  );
}
