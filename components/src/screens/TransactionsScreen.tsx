import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import ScreenShell from "./../../ScreenShell";
import Pill from "./../../Pill";
import { styles } from "../../../theme/styles";
import { allTx } from "../data/MockData";

interface TransactionsScreenProps {}
export default function AllTransactionsScreen(props: TransactionsScreenProps) {
  const router = useRouter();

  return (
    <ScreenShell>
      <View style={styles.filtersRow}>
        <Pill title="All" active />
        <Pill title="Status" active={false} />
        <Pill title="Currency" active={false} />
      </View>

      {allTx.map((g, idx) => (
        <View key={idx} style={{ marginTop: 14 }}>
          <Text style={styles.groupDate}>{g.date}</Text>
          <View style={styles.groupLine} />

          {g.items.map((t, i) => (
            <Pressable
              key={i}
              style={styles.txRow}
              onPress={() => {
                if (t.title.startsWith("To ")) router.push("/sendmoneyngn");
              }}
            >
              <View style={styles.txLeft}>
                <View style={styles.txIcon}>
                  <Text style={{ fontWeight: "900" }}>{t.leftIcon}</Text>
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
            </Pressable>
          ))}
        </View>
      ))}
    </ScreenShell>
  );
}
