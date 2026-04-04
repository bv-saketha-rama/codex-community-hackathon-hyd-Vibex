import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme/tokens";

interface EngineFactSheetProps {
  compact?: boolean;
}

const FACTS = [
  {
    label: "Model",
    value: "A gated Gemma mobile artifact is downloaded onto the Android device and prepared locally."
  },
  {
    label: "Plan",
    value: "Repo context is fetched from the backend, then clarification and patch generation happen on-device."
  },
  {
    label: "Code",
    value: "Vibex pushes the locally generated patch to GitHub and keeps Convex job state in sync."
  }
];

export function EngineFactSheet({ compact = false }: EngineFactSheetProps) {
  return (
    <View style={[styles.container, compact ? styles.compactContainer : undefined]}>
      <Text style={styles.eyebrow}>Backend model path</Text>
      <Text style={styles.title}>What Vibex runs on your phone</Text>
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
