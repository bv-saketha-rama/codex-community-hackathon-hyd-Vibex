import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme/tokens";

interface EngineFactSheetProps {
  compact?: boolean;
}

const FACTS = [
  {
    label: "Voice",
    value: "gpt-4o-mini-transcribe turns audio into text before Vibex thinks."
  },
  {
    label: "Plan",
    value: "gpt-5.4 asks short follow-ups, builds the spec, and stops after 3 turns."
  },
  {
    label: "Code",
    value: "gpt-5.4 generates the patch, then Vibex commits to GitHub and watches deploys."
  }
];

export function EngineFactSheet({ compact = false }: EngineFactSheetProps) {
  return (
    <View style={[styles.container, compact ? styles.compactContainer : undefined]}>
      <Text style={styles.eyebrow}>Backend model path</Text>
      <Text style={styles.title}>What Vibex runs for you</Text>
      {FACTS.map((fact) => (
        <View key={fact.label} style={styles.row}>
          <Text style={styles.label}>{fact.label}</Text>
          <Text style={styles.value}>{fact.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  compactContainer: {
    marginBottom: spacing.md
  },
  eyebrow: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 8
  },
  title: {
    color: colors.text,
    fontFamily: "SpaceGroteskBold",
    fontSize: 20,
    marginBottom: spacing.md
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: "rgba(143, 232, 255, 0.1)",
    paddingTop: 12,
    marginTop: 12
  },
  label: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6
  },
  value: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 14,
    lineHeight: 21
  }
});
