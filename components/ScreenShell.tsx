import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { COLORS } from "../theme/colors";

interface Props {
  children: React.ReactNode;
  padded?: boolean;
  
}
interface TitleProps {
  title: string;
  showBack?: boolean;
}

export default function ScreenShell({ children, padded = true }: Props) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: padded ? 16 : 0, paddingBottom: 26 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
