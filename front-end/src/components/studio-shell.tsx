import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme/tokens";

interface StudioShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  keyboardAware?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function StudioShell({
  eyebrow,
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
  keyboardAware = false,
  contentContainerStyle
}: StudioShellProps) {
  const body = keyboardAware ? (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 24}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, contentContainerStyle]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  ) : scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentContainerStyle]}>{children}</View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#04070C", "#09111A", "#04070C"]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orbA} />
      <View style={styles.orbB} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerRight}
        </View>
        {body}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  fill: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.md
  },
  eyebrow: {
    fontFamily: "DMSansMedium",
    fontSize: 12,
    color: colors.accentWarm,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    marginBottom: 8
  },
  title: {
    fontFamily: "SpaceGroteskBold",
    fontSize: 32,
    color: colors.text
  },
  subtitle: {
    fontFamily: "DMSans",
    color: colors.muted,
    fontSize: 15,
    marginTop: 10,
    lineHeight: 22
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl + spacing.lg
  },
  orbA: {
    position: "absolute",
    right: -40,
    top: 120,
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: "rgba(143, 232, 255, 0.12)"
  },
  orbB: {
    position: "absolute",
    left: -80,
    bottom: 60,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(215, 255, 111, 0.08)"
  }
});
