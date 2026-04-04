import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { BrandArtwork } from "@/components/brand-artwork";
import { colors, spacing } from "@/theme/tokens";

export function LoadingScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, translateY]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#04070C", "#071019", "#04070C"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundGlowA} />
      <View style={styles.backgroundGlowB} />
      <Animated.View
        style={[
          styles.content,
          {
            opacity,
            transform: [{ translateY }]
          }
        ]}
      >
        <Text style={styles.eyebrow}>Booting workspace</Text>
        <Text style={styles.title}>Vibex</Text>
        <Text style={styles.subtitle}>A mobile inspired version of Codex</Text>
        <BrandArtwork />
        <View style={styles.footerRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.footerCopy}>Loading your mobile coding workspace</Text>
        </View>
        <Text style={styles.engineCopy}>
          Voice: gpt-4o-mini-transcribe | Chat and code: gpt-5.4
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  content: {
    width: "100%"
  },
  eyebrow: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    marginBottom: 10
  },
  title: {
    color: colors.text,
    fontFamily: "SpaceGroteskBold",
    fontSize: 44
  },
  subtitle: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
    marginBottom: spacing.xl,
    maxWidth: 320
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  footerCopy: {
    color: colors.muted,
    fontFamily: "DMSansMedium",
    fontSize: 14
  },
  engineCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.md,
    maxWidth: 280
  },
  backgroundGlowA: {
    position: "absolute",
    top: 118,
    right: -48,
    width: 210,
    height: 210,
    borderRadius: 210,
    backgroundColor: "rgba(143, 232, 255, 0.12)"
  },
  backgroundGlowB: {
    position: "absolute",
    bottom: 84,
    left: -82,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: "rgba(215, 255, 111, 0.08)"
  }
});
