import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { styles } from "../theme/styles";

interface Slide {
  key: string;
  title: string;
  subtitle: string;
  bg: string;
  image: any;
}

const { width: W, height: H } = Dimensions.get("window");

const SLIDES = [
  {
    key: "s1",
    title: "Open foreign\ncurrency accounts",
    subtitle: "Open accounts in foreign currencies to\nreceive and send money",
    bg: "#E7EDF0",
    image: require("../assets/images/onboarding/slide1.png"),
  },
  {
    key: "s2",
    title: "Customer support\nround the clock",
    subtitle: "We take your money seriously and we\nresolve all issues quickly!",
    bg: "#E7EDF0",
    image: require("../assets/images/onboarding/slide2.png"),
  },
  {
    key: "s3",
    title: "Never worry about\nfees anymore",
    subtitle: "We guarantee competitive exchange\nrates always",
    bg: "#F1E7DA",
    image: require("../assets/images/onboarding/slide3.png"),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<Slide> | null>(null);

  // UI index for dots/background
  const [uiIndex, setUiIndex] = useState(0);

  // "truth" index to avoid jumps
  const currentIndexRef = useRef(0);

  // keep interval stable
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const data = useMemo(() => SLIDES, []);

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }:any) => {
    if (!viewableItems || viewableItems.length === 0) return;

    const i = viewableItems[0]?.index ?? 0;

    currentIndexRef.current = i;
    setUiIndex((prev) => (prev === i ? prev : i));
  }).current;

  // ✅ Auto slide that loops correctly back to 0
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const next =
        currentIndexRef.current + 1 >= data.length ? 0 : currentIndexRef.current + 1;

      currentIndexRef.current = next;
      setUiIndex(next);

      listRef.current?.scrollToIndex({
        index: next,
        animated: true,
      });
    }, 3500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [data.length]);

  const finishOnboardingAndGo = async (path:any) => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    router.replace(path);
  };

  const topInset = Platform.OS === "ios" ? 54 : 22;

  return (
    <View style={{ flex: 1, backgroundColor: data[uiIndex]?.bg || "#E7EDF0" }}>
      <StatusBar style="dark" />

      <FlatList
        ref={listRef}
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: W, backgroundColor: item.bg }]}>
            {/* Language pill */}
            <Pressable style={[styles.langPill, { top: topInset }]}>
              <Text style={styles.langText}>🌐 English (United Kingdom)</Text>
              <Text style={styles.langArrow}>⌄</Text>
            </Pressable>

            {/* Text block */}
            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>

            {/* Image block */}
            <View style={styles.imageWrap}>
              <Image source={item.image} style={styles.hero} resizeMode="contain" />
            </View>

            {/* Bottom block */}
            <View style={styles.bottomWrap}>
              {/* Dots */}
              <View style={styles.dots}>
                {data.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === uiIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>

              {/* Buttons */}
              <Pressable
                style={styles.primaryBtn}
                onPress={() => finishOnboardingAndGo("/getstarted")}
              >
                <Text style={styles.primaryBtnText}>Create an account</Text>
              </Pressable>

              <Pressable onPress={() => finishOnboardingAndGo("/")}>
                <Text style={styles.loginText}>Log In</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}
