import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { ActionButton } from "@/components/action-button";
import { ModelStatusCard } from "@/components/model-status-card";
import { StudioShell } from "@/components/studio-shell";
import {
  deleteMcp,
  deleteSkill,
  fetchAgentDoc,
  fetchMarketplaceSkills,
  fetchMcps,
  fetchProject,
  fetchSkills,
  saveAgentDoc,
  saveMcp,
  saveSkill,
  updateMcp,
  updateProject,
  updateSkill
} from "@/lib/api";
import {
  deleteDeviceModel,
  getDeviceModelStatus,
  prepareDeviceModel,
  startDeviceModelDownload
} from "@/lib/device-model";
import { signInToHuggingFace } from "@/lib/hf-auth";
import { getDeviceModelManifest } from "@/lib/model-manifest";
import { isAuthError } from "@/lib/api";
import { signOut, useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";
import type { MarketplaceSkill, McpServerRecord, ProjectRecord, SkillRecord } from "@/types";

export default function ProjectSettingsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const session = useAppStore((state) => state.session);
  const hfSession = useAppStore((state) => state.hfSession);
  const setHfSession = useAppStore((state) => state.setHfSession);
  const deviceModelStatus = useAppStore((state) => state.deviceModelStatus);
  const setDeviceModelStatus = useAppStore((state) => state.setDeviceModelStatus);
  const pushNotification = useAppStore((state) => state.pushNotification);
  const modelManifest = getDeviceModelManifest();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [mcps, setMcps] = useState<McpServerRecord[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceSkill[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [branch, setBranch] = useState("");
  const [draftSkillId, setDraftSkillId] = useState<string | undefined>();
  const [draftSkillName, setDraftSkillName] = useState("");
  const [draftSkillContent, setDraftSkillContent] = useState("");
  const [draftMcpId, setDraftMcpId] = useState<string | undefined>();
  const [draftMcpName, setDraftMcpName] = useState("");
  const [draftMcpUrl, setDraftMcpUrl] = useState("");
  const [draftMcpCommand, setDraftMcpCommand] = useState("");
  const [draftMcpDescription, setDraftMcpDescription] = useState("");
  const [draftMcpInstructions, setDraftMcpInstructions] = useState("");
  const [agentContent, setAgentContent] = useState("");
  const [agentEnabled, setAgentEnabled] = useState(true);

  const relevantSkills = useMemo(
    () =>
      skills.filter(
        (skill) => skill.scope === "user" || (projectId ? skill.projectId === projectId : false)
      ),
    [projectId, skills]
  );

  const relevantMcps = useMemo(
    () => mcps.filter((mcp) => !mcp.projectId || mcp.projectId === projectId),
    [mcps, projectId]
  );

  async function loadWorkspace() {
    if (!session || !projectId) {
      return;
    }

    try {
      const [projectResponse, skillResponse, marketplaceResponse, mcpResponse, agentResponse] =
        await Promise.all([
          fetchProject(projectId),
          fetchSkills(session.userId),
          fetchMarketplaceSkills(),
          fetchMcps(session.userId),
          fetchAgentDoc(projectId)
        ]);

      setProject(projectResponse.project);
      setProjectTitle(projectResponse.project.title);
      setBranch(projectResponse.project.branch);
      setSkills(skillResponse.skills);
      setMarketplace(marketplaceResponse.skills);
      setMcps(mcpResponse.mcps);
      setAgentContent(agentResponse.agentDoc?.content || "");
      setAgentEnabled(agentResponse.agentDoc?.enabled ?? true);
      setDeviceModelStatus(await getDeviceModelStatus());
    } catch (error) {
      if (isAuthError(error)) {
        void signOut();
        router.replace("/onboarding");
        return;
      }
      Alert.alert(
        "Unable to load settings",
        error instanceof Error ? error.message : "Check your connection and try again."
      );
    }
  }

  useEffect(() => {
    if (!session) {
      router.replace("/onboarding");
      return;
    }

    void loadWorkspace();
  }, [projectId, session]);

  async function handleSignInToHf() {
    try {
      const nextSession = await signInToHuggingFace();
      setHfSession(nextSession);
      pushNotification({
        title: "Hugging Face connected",
        body: "You can now download the gated Android model artifact to this device.",
        tone: "success"
      });
    } catch (error) {
      Alert.alert(
        "Unable to connect Hugging Face",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  async function handleDownloadModel() {
    if (modelManifest.requiresAuth && !hfSession?.accessToken) {
      Alert.alert("Hugging Face sign-in required", "Connect Hugging Face before downloading the model.");
      return;
    }

    try {
      setDeviceModelStatus({
        ...(deviceModelStatus || {
          modelId: "gemma-4-e4b-it-android",
          version: "dev-preview",
          state: "idle",
          bytesDownloaded: 0,
          totalBytes: 0,
          percentage: 0
        }),
        state: "downloading"
      });
      const status = await startDeviceModelDownload({
        accessToken: hfSession?.accessToken,
        onProgress: setDeviceModelStatus
      });
      setDeviceModelStatus(status);
      pushNotification({
        title: "Model ready",
        body: "The Android on-device runtime is prepared locally.",
        tone: "success"
      });
    } catch (error) {
      setDeviceModelStatus({
        ...(deviceModelStatus || {
          modelId: "gemma-4-e4b-it-android",
          version: "dev-preview",
          bytesDownloaded: 0,
          totalBytes: 0,
          percentage: 0
        }),
        state: "failed",
        error: error instanceof Error ? error.message : "Model download failed."
      });
      Alert.alert(
        "Unable to download model",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  async function handlePrepareModel() {
    const status = await prepareDeviceModel();
    setDeviceModelStatus(status);
  }

  async function handleDeleteModel() {
    const status = await deleteDeviceModel();
    setDeviceModelStatus(status);
    pushNotification({
      title: "Local model removed",
      body: "You can redownload the Android model artifact at any time.",
      tone: "info"
    });
  }

  async function handleSaveSkill() {
    if (!session || !projectId || !draftSkillName.trim() || !draftSkillContent.trim()) {
      return;
    }

    if (draftSkillId) {
      await updateSkill(draftSkillId, session.userId, {
        name: draftSkillName.trim(),
        content: draftSkillContent.trim(),
        enabled: true
      });
    } else {
      await saveSkill({
        userId: session.userId,
        projectId,
        scope: "project",
        name: draftSkillName.trim(),
        content: draftSkillContent.trim(),
        source: "custom",
        enabled: true
      });
    }

    setDraftSkillId(undefined);
    setDraftSkillName("");
    setDraftSkillContent("");
    await loadWorkspace();
  }

  async function handleSaveMcp() {
    if (!session || !projectId || !draftMcpName.trim() || !draftMcpInstructions.trim()) {
      return;
    }

    if (draftMcpId) {
      await updateMcp(draftMcpId, session.userId, {
        name: draftMcpName.trim(),
        description: draftMcpDescription.trim() || undefined,
        serverUrl: draftMcpUrl.trim() || undefined,
        command: draftMcpCommand.trim() || undefined,
        instructions: draftMcpInstructions.trim(),
        enabled: true
      });
    } else {
      await saveMcp({
        userId: session.userId,
        projectId,
        name: draftMcpName.trim(),
        description: draftMcpDescription.trim() || undefined,
        serverUrl: draftMcpUrl.trim() || undefined,
        command: draftMcpCommand.trim() || undefined,
        instructions: draftMcpInstructions.trim(),
        enabled: true
      });
    }

    setDraftMcpId(undefined);
    setDraftMcpName("");
    setDraftMcpDescription("");
    setDraftMcpUrl("");
    setDraftMcpCommand("");
    setDraftMcpInstructions("");
    await loadWorkspace();
  }

  if (!session) {
    return null;
  }

  return (
    <StudioShell
      eyebrow="Workspace settings"
      title={project?.title || "Workspace settings"}
      subtitle="Manage workspace metadata, on-device model controls, skills, MCP prompt context, and agents instructions."
      keyboardAware
      headerRight={
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <ChevronLeft color={colors.text} size={18} />
        </Pressable>
      }
    >
      <View style={styles.section}>
        <Text style={styles.label}>On-device model</Text>
        <ModelStatusCard status={deviceModelStatus} hfSession={hfSession} compact />
        <Text style={styles.helperCopy}>
          {modelManifest.requiresAuth
            ? "GitHub auth stays in Convex. The Hugging Face token stays only on this device so the Android artifact can be downloaded and prepared locally."
            : "GitHub auth stays in Convex. The default Gemma 4 LiteRT model downloads directly from the public LiteRT community build and prepares locally on this device."}
        </Text>
        {modelManifest.requiresAuth ? (
          <ActionButton
            label={hfSession ? "Reconnect Hugging Face" : "Connect Hugging Face"}
            onPress={() => void handleSignInToHf()}
            secondary
          />
        ) : null}
        <ActionButton label="Download Android model" onPress={() => void handleDownloadModel()} secondary />
        <ActionButton label="Prepare local runtime" onPress={() => void handlePrepareModel()} secondary />
        <ActionButton label="Delete local model" onPress={() => void handleDeleteModel()} secondary />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Project</Text>
        <TextInput value={projectTitle} onChangeText={setProjectTitle} style={styles.input} />
        <TextInput value={branch} onChangeText={setBranch} style={styles.input} />
        <ActionButton
          label="Save workspace details"
          onPress={async () => {
            if (!projectId) {
              return;
            }
            const response = await updateProject(projectId, {
              title: projectTitle,
              branch
            });
            setProject(response.project);
          }}
          secondary
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Skills</Text>
        {relevantSkills.map((skill) => (
          <Pressable
            key={skill._id || skill.name}
            onPress={() => {
              setDraftSkillId(skill._id);
              setDraftSkillName(skill.name);
              setDraftSkillContent(skill.content);
            }}
            style={styles.row}
          >
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{skill.name}</Text>
              <Text style={styles.rowMeta}>
                {skill.scope} | {skill.source}
              </Text>
            </View>
            <Switch
              value={skill.enabled}
              onValueChange={(value) => {
                const skillId = skill._id;
                if (skillId) {
                  void updateSkill(skillId, session.userId, { enabled: value }).then(loadWorkspace);
                }
              }}
            />
            {skill._id ? (
              <Pressable
                onPress={() => {
                  const skillId = skill._id;
                  if (skillId) {
                    void deleteSkill(skillId).then(loadWorkspace);
                  }
                }}
              >
                <Text style={styles.removeText}>Delete</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
        <TextInput
          value={draftSkillName}
          onChangeText={setDraftSkillName}
          placeholder="Skill name"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          multiline
          value={draftSkillContent}
          onChangeText={setDraftSkillContent}
          placeholder="Write the project rule set"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textarea]}
        />
        <ActionButton
          label={draftSkillId ? "Update skill" : "Save project skill"}
          onPress={handleSaveSkill}
          secondary
        />
        <Text style={styles.subtleLabel}>Marketplace</Text>
        {marketplace.map((skill) => (
          <View key={skill.id} style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{skill.name}</Text>
              <Text style={styles.rowMeta}>
                {skill.author} | {skill.description}
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                if (!projectId) {
                  return;
                }
                await saveSkill({
                  userId: session.userId,
                  projectId,
                  scope: "project",
                  name: skill.name,
                  content: skill.content,
                  source: "marketplace",
                  enabled: true
                });
                await loadWorkspace();
              }}
            >
              <Text style={styles.installText}>Install</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>MCP context</Text>
        {relevantMcps.map((mcp) => (
          <Pressable
            key={mcp._id || mcp.name}
            onPress={() => {
              setDraftMcpId(mcp._id);
              setDraftMcpName(mcp.name);
              setDraftMcpDescription(mcp.description || "");
              setDraftMcpUrl(mcp.serverUrl || "");
              setDraftMcpCommand(mcp.command || "");
              setDraftMcpInstructions(mcp.instructions);
            }}
            style={styles.row}
          >
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{mcp.name}</Text>
              <Text style={styles.rowMeta}>{mcp.description || mcp.serverUrl || mcp.command}</Text>
            </View>
            <Switch
              value={mcp.enabled}
              onValueChange={(value) => {
                const mcpId = mcp._id;
                if (mcpId) {
                  void updateMcp(mcpId, session.userId, { enabled: value }).then(loadWorkspace);
                }
              }}
            />
            {mcp._id ? (
              <Pressable
                onPress={() => {
                  const mcpId = mcp._id;
                  if (mcpId) {
                    void deleteMcp(mcpId).then(loadWorkspace);
                  }
                }}
              >
                <Text style={styles.removeText}>Delete</Text>
              </Pressable>
            ) : null}
          </Pressable>
        ))}
        <TextInput
          value={draftMcpName}
          onChangeText={setDraftMcpName}
          placeholder="MCP name"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={draftMcpDescription}
          onChangeText={setDraftMcpDescription}
          placeholder="Short description"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={draftMcpUrl}
          onChangeText={setDraftMcpUrl}
          placeholder="https://server.example.com"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={draftMcpCommand}
          onChangeText={setDraftMcpCommand}
          placeholder="Optional command"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          multiline
          value={draftMcpInstructions}
          onChangeText={setDraftMcpInstructions}
          placeholder="How should Vibex use this MCP context?"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textarea]}
        />
        <ActionButton
          label={draftMcpId ? "Update MCP context" : "Save MCP context"}
          onPress={handleSaveMcp}
          secondary
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>agents.md</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.value}>Inject into every request</Text>
          <Switch value={agentEnabled} onValueChange={setAgentEnabled} />
        </View>
        <TextInput
          multiline
          value={agentContent}
          onChangeText={setAgentContent}
          placeholder="Write long-form project instructions, architecture notes, code review rules, and operating constraints."
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.largeTextarea]}
        />
        <ActionButton
          label="Save agents.md context"
          onPress={async () => {
            if (!session || !projectId) {
              return;
            }
            await saveAgentDoc(projectId, {
              userId: session.userId,
              content: agentContent,
              enabled: agentEnabled
            });
          }}
          secondary
        />
      </View>
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl
  },
  label: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: spacing.sm
  },
  helperCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.sm
  },
  subtleLabel: {
    color: colors.muted,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    textTransform: "uppercase",
    marginTop: spacing.md,
    marginBottom: spacing.sm
  },
  value: {
    color: colors.text,
    fontFamily: "DMSansMedium",
    fontSize: 16
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily: "DMSans",
    fontSize: 15,
    marginBottom: spacing.sm
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  largeTextarea: {
    minHeight: 180,
    textAlignVertical: "top"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    gap: spacing.sm
  },
  rowCopy: {
    flex: 1
  },
  rowTitle: {
    color: colors.text,
    fontFamily: "DMSansMedium",
    fontSize: 16
  },
  rowMeta: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 13,
    marginTop: 4
  },
  removeText: {
    color: colors.danger,
    fontFamily: "DMSansMedium"
  },
  installText: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium"
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  }
});
