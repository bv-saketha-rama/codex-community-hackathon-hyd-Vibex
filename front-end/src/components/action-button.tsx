import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme/tokens";

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
}

export function ActionButton({
  label,
  onPress,
  secondary = false,
  icon,
  disabled = false
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        pressed && !disabled ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined
      ]}
    >
      <View style={styles.inner}>
        {icon}
        <Text style={[styles.label, secondary ? styles.secondaryLabel : undefined]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm
  },
  primary: {
    backgroundColor: colors.accent
  },
  secondary: {
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border
  },
  pressed: {
    opacity: 0.86
  },
  disabled: {
    opacity: 0.5
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  label: {
    color: "#0A1021",
    fontFamily: "DMSansMedium",
    fontSize: 15
  },
  secondaryLabel: {
    color: colors.text
  }
});
