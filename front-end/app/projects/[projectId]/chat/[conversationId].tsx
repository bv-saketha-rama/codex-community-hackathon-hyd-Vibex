import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Clipboard,
  Image as ImageIcon,
  Mic,
  Send,
  Settings2
} from "lucide-react-native";

import { ActionButton } from "@/components/action-button";
import { MessageBubble } from "@/components/message-bubble";
import { StatusStrip } from "@/components/status-strip";
import { StudioShell } from "@/components/studio-shell";
import {
  captureReferenceUrl,
  confirmConversation,
  fetchRepoContext,
  fetchConversation,
  fetchProject,
  saveConversationResult
} from "@/lib/api";
import {
  generateOnDeviceConversation,
  generateOnDevicePatch,
  transcribeOnDeviceAudio
} from "@/lib/device-model";
import { api } from "@/lib/convex-api";
import { pickImageBase64, readUrlFromClipboard, startRecording, stopRecording } from "@/lib/media";
import { useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";
import type {
  Attachment,
  ConversationRecord,
  ConversationSpec,
  InputMode,
  ProjectRecord
} from "@/types";

function JobWatcher() {
  const currentJobId = useAppStore((state) => state.currentJobId);
  const setJob = useAppStore((state) => state.setJob);
  const job = useQuery(api.jobs.getById, currentJobId ? { jobId: currentJobId } : "skip");

  useEffect(() => {
    if (job) {
      setJob(job, currentJobId);
    }
  }, [currentJobId, job, setJob]);

  return null;
}

export default function ConversationScreen() {
  const { projectId, conversationId } = useLocalSearchParams<{
    projectId: string;
    conversationId: string;
  }>();
  const session = useAppStore((state) => state.session);
  const currentJob = useAppStore((state) => state.currentJob);
  const setJob = useAppStore((state) => state.setJob);
  const setLoading = useAppStore((state) => state.setLoading);
  const isSubmitting = useAppStore((state) => state.isSubmitting);
  const setLatestReferenceImage = useAppStore((state) => state.setLatestReferenceImage);
  const deviceModelStatus = useAppStore((state) => state.deviceModelStatus);
  const recordingRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const recordingPrepareRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [conversation, setConversation] = useState<ConversationRecord | null>(null);
  const [spec, setSpec] = useState<ConversationSpec | undefined>();
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (!session) {
      router.replace("/onboarding");
      return;
    }

    if (!projectId || !conversationId) {
      return;
    }

    void (async () => {
      const [projectResponse, conversationResponse] = await Promise.all([
        fetchProject(projectId),
        fetchConversation(conversationId)
      ]);
      setProject(projectResponse.project);
      setConversation(conversationResponse.conversation);
      setSpec(conversationResponse.conversation.spec);
      setFollowUpCount(
        conversationResponse.conversation.messages.filter((message) => message.role === "assistant")
          .length
      );
    })();
  }, [conversationId, projectId, session]);

  useEffect(() => {
    return () => {
      const recording = recordingRef.current;
      recordingRef.current = null;
      recordingPrepareRef.current = false;
      stopRequestedRef.current = true;
      setIsRecording(false);
      if (recording) {
        void stopRecording(recording).catch(() => undefined);
      }
    };
  }, []);

  async function refreshConversation() {
    if (!conversationId) {
      return;
    }
    const response = await fetchConversation(conversationId);
    setConversation(response.conversation);
    setSpec(response.conversation.spec);
    setFollowUpCount(
      response.conversation.messages.filter((message) => message.role === "assistant").length
    );
  }

  async function submitConversation(options?: {
    audioBase64?: string;
    imageBase64?: string;
    inputOverride?: string;
    attachmentsOverride?: Attachment[];
  }) {
    if (!session || !project || !conversation) {
      return;
    }

    if (deviceModelStatus?.state !== "ready") {
      Alert.alert(
        "On-device model required",
        "Open workspace settings, connect Hugging Face, and prepare the Android model before sending a request."
      );
      return;
    }

    const nextInput = options?.inputOverride ?? draft.trim();
    const attachments = options?.attachmentsOverride ?? draftAttachments;
    if (!nextInput && !options?.audioBase64 && !options?.imageBase64) {
      return;
    }

    const inputType: InputMode = options?.audioBase64
      ? "voice"
      : options?.imageBase64
        ? "image"
        : "text";

    const nextMessages = [
      ...conversation.messages,
      {
        role: "user" as const,
        content: nextInput || "Voice request",
        inputType,
        attachments,
        createdAt: new Date().toISOString()
      }
    ];

    setConversation({
      ...conversation,
      messages: nextMessages
    });
    setDraft("");
    setDraftAttachments([]);
    setLoading(true);

    try {
      const urlAttachment = attachments.find((attachment) => attachment.kind === "url");
      const imageAttachment = attachments.find((attachment) => attachment.kind === "image");
      const screenshotBase64 = urlAttachment
        ? (await captureReferenceUrl(urlAttachment.value)).image_base64
        : options?.imageBase64 || imageAttachment?.value;
      const effectiveInput = options?.audioBase64
        ? await transcribeOnDeviceAudio(options.audioBase64)
        : nextInput || "Voice request";

      if (screenshotBase64) {
        setLatestReferenceImage(screenshotBase64);
      }

      const repoContext = await fetchRepoContext({
        userId: session.userId,
        projectId,
        messages: conversation.messages,
        repo: project.repoFullName,
        branch: project.branch,
        token: session.githubToken,
        skills: []
      });
      const response = await generateOnDeviceConversation({
        input: effectiveInput,
        messages: conversation.messages,
        followUpCount,
        repoSnapshot: repoContext.repoSnapshot,
        skillPrompt: repoContext.skillPrompt
      });

      const userMessage = {
        role: "user" as const,
        content: effectiveInput,
        inputType,
        attachments,
        createdAt: new Date().toISOString()
      };
      const assistantMessage = {
        role: "assistant" as const,
        content: response.reply,
        inputType: "text" as const,
        attachments: screenshotBase64
          ? [
              {
                kind: "image" as const,
                label: "Local reference image",
                value: screenshotBase64
              }
            ]
          : [],
        createdAt: new Date().toISOString()
      };

      await saveConversationResult({
        conversationId,
        messages: [...conversation.messages, userMessage, assistantMessage],
        spec: response.spec
      });

      setSpec(response.spec);
      setReadyToConfirm(response.readyToConfirm);
      setFollowUpCount(response.followUpCount);
      await refreshConversation();
    } finally {
      setLoading(false);
    }
  }

  async function handlePickImage() {
    const imageBase64 = await pickImageBase64();
    if (!imageBase64) {
      return;
    }

    setDraftAttachments([
      {
        kind: "image",
        label: "Screenshot reference",
        value: imageBase64
      }
    ]);
  }

  async function handlePasteUrl() {
    const url = await readUrlFromClipboard();
    if (!url) {
      return;
    }
    setDraftAttachments([
      {
        kind: "url",
        label: "Live URL reference",
        value: url
      }
    ]);
  }

  async function handleStartRecording() {
    if (recordingRef.current || recordingPrepareRef.current) {
      return;
    }

    recordingPrepareRef.current = true;
    stopRequestedRef.current = false;

    try {
      const recording = await startRecording();
      if (stopRequestedRef.current) {
        await stopRecording(recording).catch(() => undefined);
        stopRequestedRef.current = false;
        return;
      }

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      Alert.alert(
        "Unable to start recording",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      recordingPrepareRef.current = false;
    }
  }

  async function handleStopRecording() {
    stopRequestedRef.current = true;

    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      return;
    }

    recordingRef.current = null;
    setIsRecording(false);

    try {
      const audioBase64 = await stopRecording(activeRecording);
      await submitConversation({ audioBase64, inputOverride: "Voice request" });
    } catch (error) {
      Alert.alert(
        "Unable to finish recording",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      stopRequestedRef.current = false;
    }
  }

  async function handleConfirm() {
    if (!session || !project || !spec) {
      return;
    }

    if (deviceModelStatus?.state !== "ready") {
      Alert.alert(
        "On-device model required",
        "Prepare the Android model locally before generating a patch."
      );
      return;
    }

    setLoading(true);
    try {
      const repoContext = await fetchRepoContext({
        userId: session.userId,
        projectId,
        messages: conversation?.messages || [],
        repo: project.repoFullName,
        branch: project.branch,
        token: session.githubToken,
        skills: []
      });
      const patch = await generateOnDevicePatch({
        spec,
        repoSnapshot: repoContext.repoSnapshot,
        skillPrompt: repoContext.skillPrompt
      });
      const response = await confirmConversation({
        userId: session.userId,
        projectId,
        conversationId,
        repo: project.repoFullName,
        branch: project.branch,
        token: session.githubToken,
        patch
      });

      setJob(
        {
          projectId,
          conversationId,
          status: "queued",
          message: "Local patch queued for GitHub push."
        },
        response.jobId
      );
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return null;
  }

  return (
    <StudioShell
      eyebrow="Chat"
      title={conversation?.title || "New chat"}
      subtitle={
        project
          ? `${project.repoFullName} | clarification ${Math.min(followUpCount, 3)}/3`
          : "Opening chat"
      }
      scroll={false}
      keyboardAware
      headerRight={
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Text style={styles.backText}>Back</Text>
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
      {process.env.EXPO_PUBLIC_CONVEX_URL ? <JobWatcher /> : null}
      <StatusStrip job={currentJob} />

      <View style={styles.flex}>
        <View style={styles.messages}>
          {conversation?.messages.length ? (
            conversation.messages.map((message) => (
              <MessageBubble
                key={`${message.role}-${message.createdAt}-${message.content}`}
                message={message}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Start with text, screenshot, URL, or voice</Text>
              <Text style={styles.emptyCopy}>
                This Vibex chat is scoped to the current repo workspace. Ask for changes, answer
                the clarifying prompts, then ship when the spec is ready.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.composer}>
          {draftAttachments.length ? (
            <View style={styles.attachmentRow}>
              {draftAttachments.map((attachment) => (
                <View key={attachment.value} style={styles.attachment}>
                  <Text style={styles.attachmentText}>{attachment.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <TextInput
            multiline
            numberOfLines={4}
            style={styles.input}
            placeholder="Describe the change to run locally on this device..."
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={setDraft}
          />

          <View style={styles.actionsRow}>
            <Pressable onPress={handlePickImage} style={styles.control}>
              <ImageIcon color={colors.text} size={18} />
              <Text style={styles.controlText}>Image</Text>
            </Pressable>
            <Pressable onPress={handlePasteUrl} style={styles.control}>
              <Clipboard color={colors.text} size={18} />
              <Text style={styles.controlText}>URL</Text>
            </Pressable>
            <Pressable
              onPressIn={handleStartRecording}
              onPressOut={() => void handleStopRecording()}
              style={[
                styles.micControl,
                (isSubmitting || isRecording) ? styles.micControlActive : undefined,
                isSubmitting ? styles.disabled : undefined
              ]}
            >
              <Mic color="#050816" size={18} />
              <Text style={styles.micText}>{isRecording ? "Recording..." : "Hold to record"}</Text>
            </Pressable>
            <Pressable
              onPress={() => void submitConversation()}
              style={[
                styles.sendControl,
                isSubmitting || deviceModelStatus?.state !== "ready" ? styles.disabled : undefined
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#050816" />
              ) : (
                <Send color="#050816" size={18} />
              )}
            </Pressable>
          </View>

          {readyToConfirm ? (
            <ActionButton label="Generate local patch and ship" onPress={handleConfirm} />
          ) : null}
        </View>
      </View>
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  headerActions: {
    flexDirection: "row",
    gap: 10
  },
  iconButton: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft
  },
  backText: {
    color: colors.text,
    fontFamily: "DMSansMedium",
    fontSize: 13
  },
  messages: {
    flex: 1,
    paddingBottom: spacing.md
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingBottom: spacing.md
  },
  attachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.sm
  },
  attachment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.panelSoft
  },
  attachmentText: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12
  },
  input: {
    minHeight: 116,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily: "DMSans",
    fontSize: 15,
    textAlignVertical: "top"
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.sm
  },
  control: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  controlText: {
    color: colors.text,
    fontFamily: "DMSansMedium",
    fontSize: 13
  },
  micControl: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.accentWarm
  },
  micControlActive: {
    backgroundColor: "rgba(255, 123, 143, 0.92)"
  },
  micText: {
    color: "#050816",
    fontFamily: "DMSansMedium",
    fontSize: 13
  },
  sendControl: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  emptyState: {
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
    marginBottom: 10
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 15,
    lineHeight: 22
  },
  disabled: {
    opacity: 0.6
  }
});
