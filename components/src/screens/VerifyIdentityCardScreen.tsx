import React,{useEffect} from "react";
import { View, Text, Pressable, Image } from "react-native";
import { styles } from "../../../theme/styles";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/theme/colors";

interface Props {
  onPress: () => void;
  userPhone: string;
}

export default function VerifyIdentityCardScreen({ onPress, userPhone }: Props) {
    const router = useRouter();
    const [emailVerified, setEmailVerified] = React.useState(false);
    useEffect(()=>{
      const checkEmailVerification = async () => {
        const emailVerified = await AsyncStorage.getItem("email_verified");
        setEmailVerified(emailVerified === "true");
      };
      checkEmailVerification();
    }, []);
  return (
    <View style={styles.verifyCard}>
      <View style={styles.verifyCardLeft}>
        <Text style={styles.verifySmallTitle}>Finish setting up your account</Text>

        <Text style={styles.verifyBigTitle}>Verify Identity</Text>

        <View style={styles.verifyProgressRow}>
          <View style={styles.verifyProgressTrack}>
            <View style={emailVerified ? styles.verifyProgressHalf : styles.verifyProgressEmpty} />
          </View>
          <Text style={styles.verifyProgressText}>{emailVerified ? "1 / 2 completed" : "1 / 2 completed"}</Text>
        </View>

        <Pressable style={styles.verifyCardBtn} onPress={onPress}>
          <Text style={styles.verifyCardBtnText}>Verify</Text>
        </Pressable>
      </View>

      {/* <Image
        source={require("../../../assets/images/icons/identity_verification.png")}
        style={styles.verifyCardIcon}
        resizeMode="contain"
      /> */}
      <Ionicons
        name="person-circle-outline"
        size={22}
        color={COLORS.primary}
      />

    </View>
  );
}
