import { StyleSheet, Text, View } from "react-native";

import { nextStatusCopy, statusLabel } from "@/lib/job";
import { colors, radius, spacing } from "@/theme/tokens";
import type { JobRecord } from "@/types";

export function StatusStrip({ job }: { job?: JobRecord }) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{statusLabel(job?.status || "drafting")}</Text>
      </View>
      <Text style={styles.text}>{nextStatusCopy(job)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(143, 232, 255, 0.12)",
    marginBottom: 10
  },
  badgeText: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  text: {
    color: colors.text,
    fontFamily: "DMSans",
    fontSize: 15,
    lineHeight: 22
  }
});
