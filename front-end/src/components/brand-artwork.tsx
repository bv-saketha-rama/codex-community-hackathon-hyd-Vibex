import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radius, spacing } from "@/theme/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const artworkSource = require("../../assets/codex-cli-splash.png");

interface BrandArtworkProps {
  compact?: boolean;
  caption?: string;
}

export function BrandArtwork({ compact = false, caption = "Codex open-source splash" }: BrandArtworkProps) {
  return (
    <View style={[styles.frame, compact ? styles.compactFrame : undefined]}>
      <Image
        source={artworkSource}
        resizeMode="cover"
        style={[styles.image, compact ? styles.compactImage : undefined]}
      />
      <LinearGradient
        colors={["rgba(5, 7, 11, 0.08)", "rgba(5, 7, 11, 0.12)", "rgba(5, 7, 11, 0.9)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} />
      <View style={styles.captionRow}>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    minHeight: 264,
    marginBottom: spacing.lg
  },
  compactFrame: {
    minHeight: 182
  },
  image: {
    width: "100%",
    height: 264
  },
  compactImage: {
    height: 182
  },
  glow: {
    position: "absolute",
    right: -50,
    top: 22,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: "rgba(143, 232, 255, 0.18)"
  },
  captionRow: {
    position: "absolute",
    left: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(6, 10, 17, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(143, 232, 255, 0.16)"
  },
  caption: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  }
});
