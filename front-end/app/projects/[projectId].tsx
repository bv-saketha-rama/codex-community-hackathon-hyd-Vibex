import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, MessageSquarePlus, Settings2 } from "lucide-react-native";

import { ActionButton } from "@/components/action-button";
import { StatusStrip } from "@/components/status-strip";
import { StudioShell } from "@/components/studio-shell";
import { createConversation, fetchProject, fetchProjectConversations, isAuthError } from "@/lib/api";
import { signOut, useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";
import type { ConversationRecord, ProjectRecord } from "@/types";

function formatUpdatedAt(value: number) {
  return new Date(value).toLocaleString();
}

function messagePreview(conversation: ConversationRecord) {
  const latest = conversation.messages[conversation.messages.length - 1];
  return latest?.content || "No messages yet.";
}

export default function ProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const session = useAppStore((state) => state.session);
  const currentJob = useAppStore((state) => state.currentJob);
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  useEffect(() => {
    if (!session) {
      router.replace("/onboarding");
      return;
    }

    if (!projectId) {
      return;
    }

    setActiveProjectId(projectId);
    void (async () => {
      setLoadingWorkspace(true);
      try {
        const [projectResponse, conversationResponse] = await Promise.all([
          fetchProject(projectId),
          fetchProjectConversations(projectId)
        ]);
        setProject(projectResponse.project);
        setConversations(conversationResponse.conversations);
      } catch (error) {
        if (isAuthError(error)) {
          void signOut();
          router.replace("/onboarding");
          return;
        }
        Alert.alert(
          "Unable to load workspace",
          error instanceof Error ? error.message : "Check your connection and try again."
        );
      } finally {
        setLoadingWorkspace(false);
      }
    })();
  }, [projectId, session, setActiveProjectId]);

  async function handleNewConversation() {
    if (!session || !projectId) {
      return;
    }

    setCreatingConversation(true);
    try {
      const { conversation } = await createConversation({
        userId: session.userId,
        projectId,
        title: "New chat"
      });
      router.push(`/projects/${projectId}/chat/${conversation._id}`);
    } finally {
      setCreatingConversation(false);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <StudioShell
      eyebrow="Workspace"
      title={project?.title || "Loading workspace"}
      subtitle={
        project
          ? `${project.ownerLogin} | ${project.repoFullName} | ${project.branch}`
          : "Opening your repo-backed workspace"
      }
      headerRight={
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/projects")} style={styles.iconButton}>
            <ChevronLeft color={colors.text} size={18} />
          </Pressable>
          {projectId ? (
            <Pressable
              onPress={() => router.push(`/projects/${projectId}/settings`)}
              style={styles.iconButton}
            >
              <Settings2 color={colors.text} size={18} />
            </Pressable>
          ) : null}
        </View>
      }
    >
      <StatusStrip job={currentJob} />

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Live preview</Text>
        <Text style={styles.summaryValue}>{project?.vercelUrl || "Not configured yet"}</Text>
      </View>

      {loadingWorkspace ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accentWarm} />
          <Text style={styles.loadingCopy}>Opening workspace...</Text>
        </View>
      ) : null}

      <ActionButton
        label={creatingConversation ? "Creating chat..." : "Start a new chat"}
        onPress={handleNewConversation}
        icon={<MessageSquarePlus color="#0A1021" size={18} />}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Chats</Text>
        {conversations.map((conversation) => (
          <Pressable
            key={conversation._id}
            onPress={() => router.push(`/projects/${projectId}/chat/${conversation._id}`)}
            style={styles.chatRow}
          >
            <Text style={styles.chatTitle}>{conversation.title}</Text>
            <Text style={styles.chatPreview}>{messagePreview(conversation)}</Text>
            <Text style={styles.chatMeta}>
              {conversation.messages.length} messages | {formatUpdatedAt(conversation.updatedAt)}
            </Text>
          </Pressable>
        ))}
        {!conversations.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptyCopy}>
              Start a new chat to vibe code against this repo with text, screenshots, URLs, or voice.
            </Text>
          </View>
        ) : null}
      </View>
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: 10
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft
  },
  summary: {
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg
  },
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  loadingCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 14
  },
  summaryLabel: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: spacing.xs
  },
  summaryValue: {
    color: colors.text,
    fontFamily: "DMSansMedium",
    fontSize: 15
  },
  section: {
    marginTop: spacing.md
  },
  sectionLabel: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: spacing.sm
  },
  chatRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.lg
  },
  chatTitle: {
    color: colors.text,
    fontFamily: "SpaceGroteskBold",
    fontSize: 20
  },
  chatPreview: {
    color: colors.text,
    fontFamily: "DMSans",
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm
  },
  chatMeta: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 13,
    marginTop: spacing.sm
  },
  empty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.panelSoft
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: "SpaceGroteskBold",
    fontSize: 20,
    marginBottom: spacing.sm
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 15,
    lineHeight: 22
  }
});
