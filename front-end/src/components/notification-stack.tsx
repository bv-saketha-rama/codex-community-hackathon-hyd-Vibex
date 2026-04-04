import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";
import type { AppNotification } from "@/types";

const toneStyles: Record<AppNotification["tone"], { border: string; accent: string; background: string }> = {
  info: {
    border: "rgba(143, 232, 255, 0.24)",
    accent: colors.accentWarm,
    background: "rgba(9, 16, 24, 0.96)"
  },
  success: {
    border: "rgba(120, 245, 168, 0.24)",
    accent: colors.success,
    background: "rgba(9, 18, 16, 0.96)"
  },
  warning: {
    border: "rgba(215, 255, 111, 0.24)",
    accent: colors.accent,
    background: "rgba(17, 18, 10, 0.96)"
  },
  error: {
    border: "rgba(255, 123, 143, 0.24)",
    accent: colors.danger,
    background: "rgba(18, 9, 12, 0.96)"
  }
};

export function NotificationStack() {
  const notifications = useAppStore((state) => state.notifications);
  const dismissNotification = useAppStore((state) => state.dismissNotification);
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const current = notifications[0];

  useEffect(() => {
    if (!current) {
      return;
    }

    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true
    }).start();

    const timer = setTimeout(() => {
      dismissNotification(current.id);
    }, 3800);

    return () => clearTimeout(timer);
  }, [current?.id, dismissNotification, fade]);

  if (!current) {
    return null;
  }

  const tone = toneStyles[current.tone];

  return (
    <View pointerEvents="box-none" style={[styles.container, { top: insets.top + spacing.sm }]}>
      <Animated.View style={{ opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }}>
        <Pressable
          onPress={() => dismissNotification(current.id)}
          style={[
            styles.banner,
            {
              borderColor: tone.border,
              backgroundColor: tone.background
            }
          ]}
        >
          <Text style={[styles.title, { color: tone.accent }]}>{current.title}</Text>
          {current.body ? <Text style={styles.body}>{current.body}</Text> : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 60
  },
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 4
  },
  title: {
    fontFamily: "DMSansMedium",
    fontSize: 14,
    marginBottom: 6
  },
  body: {
    color: colors.text,
    fontFamily: "DMSans",
    fontSize: 13,
    lineHeight: 20
  }
});
