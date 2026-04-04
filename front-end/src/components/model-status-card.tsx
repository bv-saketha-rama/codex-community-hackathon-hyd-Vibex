import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme/tokens";
import type { DeviceModelStatus, HfSession } from "@/types";

function formatBytes(bytes: number) {
  if (!bytes) {
    return "0 MB";
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ModelStatusCard(props: {
  status?: DeviceModelStatus;
  hfSession?: HfSession;
  compact?: boolean;
}) {
  const status = props.status;
  const subtitle =
    status?.state === "downloading"
      ? `${status.percentage}% downloaded • ${formatBytes(status.bytesDownloaded)} / ${formatBytes(status.totalBytes)}`
      : status?.state === "ready"
        ? `Model ${status.version} is available locally on this device.`
        : status?.state === "failed"
          ? status.error || "Model preparation failed."
          : "Sign in to Hugging Face to unlock the gated on-device model download.";

  return (
    <View style={[styles.container, props.compact ? styles.compactContainer : undefined]}>
      <Text style={styles.eyebrow}>On-device model</Text>
      <Text style={styles.title}>Android Gemma runtime</Text>
      <Text style={styles.value}>{subtitle}</Text>
      <Text style={styles.meta}>
        {props.hfSession?.handle
          ? `Hugging Face: ${props.hfSession.handle}`
          : "Hugging Face: not connected"}
      </Text>
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
    marginBottom: spacing.sm
  },
  value: {
    color: colors.text,
    fontFamily: "DMSans",
    fontSize: 14,
    lineHeight: 21
  },
  meta: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 13,
    marginTop: 10
  }
});
