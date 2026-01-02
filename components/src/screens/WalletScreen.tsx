import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ScreenShell from "./../../ScreenShell";
import WalletAction from "./../../WalletAction";
import DetailRow from "./../../DetailRow";
import { styles } from "../../../theme/styles";
import { COLORS } from "../../../theme/colors";

interface AccountDetails {
  id: string;
  currencyCode: string;
  accountName: string;
  iban?: string;
  bicSwift?: string;
  status: string;
  balance: number | null;
  flag: string;
  currencyName: string;
  accountNumber?: string;
  routingNumber?: string;
  sortCode?: string;
  bankName?: string;
  bankAddress?: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [tab, setTab] = useState("Transactions");
  const [account, setAccount] = useState<AccountDetails | null>(null);

  useEffect(() => {
    // Parse account data from params
    if (params.accountData) {
      try {
        const parsed = JSON.parse(params.accountData as string);
        setAccount(parsed);
      } catch (e) {
        console.log("Error parsing account data:", e);
      }
    }
  }, [params.accountData]);

  const formatBalance = (balance: number | null, currencyCode: string) => {
    if (balance === null || balance === undefined) return `0.00 ${currencyCode}`;
    return `${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
  };

  if (!account) {
    return (
      <ScreenShell>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <View style={styles.centerHeader}>
        <Text style={styles.flagBig}>{account.flag}</Text>
        <Text style={styles.walletTitle}>{account.currencyCode} balance</Text>
        <Text style={styles.walletAmount}>{formatBalance(account.balance, account.currencyCode)}</Text>

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
        <View style={{ marginTop: 12, paddingHorizontal: 16 }}>
          <Text style={{ color: "#888", textAlign: "center", marginTop: 24 }}>
            No transactions yet
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 18 }}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <View style={styles.detailsCard}>
            <DetailRow k="Account name" v={account.accountName || "—"} />
            <DetailRow k="Currency" v={`${account.currencyName} (${account.currencyCode})`} />
            {account.iban && <DetailRow k="IBAN" v={account.iban} />}
            {account.bicSwift && <DetailRow k="BIC/SWIFT" v={account.bicSwift} />}
            {account.accountNumber && <DetailRow k="Account Number" v={account.accountNumber} />}
            {account.routingNumber && <DetailRow k="Routing Number" v={account.routingNumber} />}
            {account.sortCode && <DetailRow k="Sort Code" v={account.sortCode} />}
            {account.bankName && <DetailRow k="Bank Name" v={account.bankName} />}
            {account.bankAddress && <DetailRow k="Bank Address" v={account.bankAddress} />}
            <DetailRow k="Status" v={account.status || "Active"} />
          </View>
        </View>
      )}
    </ScreenShell>
  );
}
