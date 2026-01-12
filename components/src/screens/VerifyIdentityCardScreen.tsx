import React,{useEffect} from "react";
import { View, Text, Pressable, Image } from "react-native";
import { styles } from "../../../theme/styles";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Props {
  onPress: () => void;
  email: string;
}

export default function VerifyIdentityCardScreen({ onPress, email }: Props) {
    const router = useRouter();
    
  return (
    <View style={styles.verifyCard}>
      <View style={styles.verifyCardLeft}>
        <Text style={styles.verifySmallTitle}>Finish setting up your account</Text>

        <Text style={styles.verifyBigTitle}>Verify your email</Text>

        {/* <View style={styles.verifyProgressRow}>
          <View style={styles.verifyProgressTrack}>
            <View style={styles.verifyProgressFill} />
          </View>
          <Text style={styles.verifyProgressText}>1 / 5 completed</Text>
        </View> */}

        <Pressable style={styles.verifyCardBtn} onPress={onPress}>
          <Text style={styles.verifyCardBtnText}>Verify email</Text>
        </Pressable>
      </View>

      <Image
        source={require("../../../assets/images/icons/identity_verification.png")}
        style={styles.verifyCardIcon}
        resizeMode="contain"
      />
    </View>
  );
}
