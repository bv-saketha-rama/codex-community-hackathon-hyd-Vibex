import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme/tokens";
import type { ConversationMessage } from "@/types";

export function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.container, isUser ? styles.user : styles.assistant]}>
      <Text style={styles.role}>{isUser ? "You" : "Vibex"}</Text>
      <Text style={styles.content}>{message.content}</Text>
      {message.attachments.length ? (
        <View style={styles.attachments}>
          {message.attachments.map((attachment) => (
            <View key={`${attachment.kind}-${attachment.value}`} style={styles.attachment}>
              <Text style={styles.attachmentText}>
                {attachment.label || attachment.kind}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  user: {
    backgroundColor: "rgba(215, 255, 111, 0.08)",
    marginLeft: spacing.xl
  },
  assistant: {
    backgroundColor: "rgba(11, 16, 23, 0.96)",
    marginRight: spacing.xl
  },
  role: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8
  },
  content: {
    color: colors.text,
    fontFamily: "DMSans",
    fontSize: 15,
    lineHeight: 22
  },
  attachments: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  attachment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(245, 247, 255, 0.08)"
  },
  attachmentText: {
    color: colors.muted,
    fontFamily: "DMSansMedium",
    fontSize: 12
  }
});
