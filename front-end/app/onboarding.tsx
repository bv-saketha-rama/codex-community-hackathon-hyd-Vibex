import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, FolderGit2, Plus } from "lucide-react-native";

import { ActionButton } from "@/components/action-button";
import { BrandArtwork } from "@/components/brand-artwork";
import { EngineFactSheet } from "@/components/engine-fact-sheet";
import { StudioShell } from "@/components/studio-shell";
import { connectGitHub } from "@/lib/auth";
import {
  createProject,
  createRepo,
  fetchProjects,
  fetchRepos,
  fetchSkills,
  saveSkill,
  updateSkill
} from "@/lib/api";
import { signOut, useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme/tokens";
import type { RepoOwner, RepoSelection } from "@/types";

const DEFAULT_COMPONENT_RULE =
  "Prefer project-level Button, Card, Input, Modal, and navigation primitives before raw elements.";

type OnboardingStep = "github" | "openai" | "repo" | "workspace";
type RepoMode = "existing" | "new";

const stepOrder: OnboardingStep[] = ["github", "openai", "repo", "workspace"];

function stepContent(step: OnboardingStep) {
  switch (step) {
    case "github":
      return {
        eyebrow: "Step 1",
        title: "Connect GitHub first",
        subtitle:
          "Open Vibex with your GitHub identity, then pick or create a repo and step into your workspace."
      };
    case "openai":
      return {
        eyebrow: "Step 2",
        title: "Add your OpenAI key",
        subtitle:
          "Use your own key for voice, clarification, and code generation. Leave it blank to fall back to the backend key."
      };
    case "repo":
      return {
        eyebrow: "Step 3",
        title: "Choose or create a repo",
        subtitle:
          "Select an existing project or create a private starter repo that Vibex can shape immediately."
      };
    case "workspace":
      return {
        eyebrow: "Step 4",
        title: "Name your workspace",
        subtitle:
          "Keep setup minimal, enter the workspace, and refine deeper rules after the repo is live."
      };
  }
}

function stepIndex(step: OnboardingStep) {
  return stepOrder.indexOf(step);
}

function parseStep(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "openai" || candidate === "repo" || candidate === "workspace") {
    return candidate;
  }
  return "github";
}

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{ step?: string }>();
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);
  const pushNotification = useAppStore((state) => state.pushNotification);
  const [step, setStep] = useState<OnboardingStep>(() => parseStep(params.step));
  const [repoMode, setRepoMode] = useState<RepoMode>("existing");
  const [repos, setRepos] = useState<RepoSelection[]>([]);
  const [owners, setOwners] = useState<RepoOwner[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<RepoOwner | undefined>();
  const [selectedRepo, setSelectedRepo] = useState<RepoSelection | undefined>();
  const [existingProjectCount, setExistingProjectCount] = useState(0);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [branch, setBranch] = useState("main");
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoVisibility, setNewRepoVisibility] = useState<"private" | "public">("private");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingOpenAIKey, setSavingOpenAIKey] = useState(false);

  useEffect(() => {
    setOpenaiApiKey(session?.openaiApiKey || "");
  }, [session?.openaiApiKey]);

  useEffect(() => {
    if (!session?.githubToken) {
      return;
    }

    void (async () => {
      setLoadingRepos(true);
      try {
        const [repoResponse, projectResponse] = await Promise.all([
          fetchRepos(session.githubToken),
          fetchProjects(session.userId)
        ]);
        setRepos(repoResponse.repos);
        setOwners(repoResponse.owners);
        setSelectedOwner((current) => {
          if (current) {
            return repoResponse.owners.find((owner) => owner.login === current.login) || current;
          }

          return (
            repoResponse.owners.find((owner) => owner.login === session.login) || repoResponse.owners[0]
          );
        });
        setExistingProjectCount(projectResponse.projects.length);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Try again.";
        Alert.alert("Unable to load repositories", message);
        if (message.toLowerCase().includes("bad credentials") || message.includes("401")) {
          void signOut();
          setStep("github");
        }
      } finally {
        setLoadingRepos(false);
      }
    })();
  }, [session?.githubToken, session?.login, session?.userId]);

  const groupedRepos = useMemo(() => {
    const groups = new Map<string, RepoSelection[]>();
    const visibleRepos = selectedOwner
      ? repos.filter((repo) => repo.ownerLogin === selectedOwner.login)
      : repos;

    for (const repo of visibleRepos) {
      const next = groups.get(repo.ownerLogin) || [];
      next.push(repo);
      groups.set(repo.ownerLogin, next);
    }

    return [...groups.entries()].map(([ownerLogin, ownerRepos]) => ({
      ownerLogin,
      ownerType: ownerRepos[0]?.ownerType || "user",
      repos: ownerRepos
    }));
  }, [repos, selectedOwner]);

  const currentStep = stepContent(step);

  function selectRepo(repo: RepoSelection) {
    setSelectedRepo(repo);
    setProjectTitle(repo.repoName);
    setBranch(repo.branch);
    setStep("workspace");
  }

  async function handleGitHubConnect() {
    setConnecting(true);
    try {
      const nextSession = await connectGitHub();
      if (nextSession) {
        setSession({
          ...nextSession,
          openaiApiKey: session?.openaiApiKey || nextSession.openaiApiKey
        });
        setSelectedOwner({
          login: nextSession.login,
          type: "user",
          avatarUrl: nextSession.avatarUrl
        });
        pushNotification({
          title: "GitHub connected",
          body: "Now add your OpenAI key or keep the backend default.",
          tone: "success"
        });
        setStep("openai");
      }
    } catch (error) {
      Alert.alert("GitHub connection failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveOpenAIKey(skip = false) {
    if (!session) {
      return;
    }

    setSavingOpenAIKey(true);
    try {
      const trimmedKey = skip ? "" : openaiApiKey.trim();
      const nextSession = {
        ...session,
        openaiApiKey: trimmedKey || undefined
      };
      setSession(nextSession);
      pushNotification({
        title: trimmedKey ? "OpenAI key saved" : "Using backend OpenAI key",
        body: trimmedKey
          ? "Vibex will use your key for chat, voice, and code generation."
          : "You can add a key later in workspace settings.",
        tone: "info"
      });
      setStep("repo");
    } finally {
      setSavingOpenAIKey(false);
    }
  }

  async function handleCreateRepo() {
    if (!session || !selectedOwner || !newRepoName.trim()) {
      return;
    }

    setCreatingRepo(true);
    try {
      const response = await createRepo({
        token: session.githubToken,
        ownerLogin: selectedOwner.login,
        ownerType: selectedOwner.type,
        repoName: newRepoName.trim(),
        description: newRepoDescription.trim() || undefined,
        visibility: newRepoVisibility
      });
      const nextRepo = response.repo;
      setRepos((current) => [nextRepo, ...current.filter((repo) => repo.fullName !== nextRepo.fullName)]);
      pushNotification({
        title: "Starter repo created",
        body: nextRepo.fullName,
        tone: "success"
      });
      selectRepo(nextRepo);
      setRepoMode("existing");
    } catch (error) {
      Alert.alert("Unable to create repository", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setCreatingRepo(false);
    }
  }

  async function handleEnterWorkspace() {
    if (!session || !selectedRepo) {
      return;
    }

    setSaving(true);
    try {
      const repo = {
        ...selectedRepo,
        branch: branch.trim() || selectedRepo.branch,
        vercelUrl: selectedRepo.vercelUrl
      };
      const { project } = await createProject({
        userId: session.userId,
        title: projectTitle.trim() || repo.repoName,
        repo
      });
      pushNotification({
        title: "Workspace ready",
        body: project.title,
        tone: "success"
      });

      const { skills } = await fetchSkills(session.userId);
      const existing = skills.find(
        (skill) =>
          skill.projectId === project._id &&
          skill.scope === "project" &&
          skill.name === "Component library"
      );

      if (existing?._id) {
        await updateSkill(existing._id, session.userId, {
          content: DEFAULT_COMPONENT_RULE,
          enabled: true
        });
      } else {
        await saveSkill({
          userId: session.userId,
          projectId: project._id,
          scope: "project",
          name: "Component library",
          content: DEFAULT_COMPONENT_RULE,
          source: "default",
          enabled: true
        });
      }

      setActiveProjectId(project._id);
      router.replace(`/projects/${project._id}`);
    } catch (error) {
      Alert.alert("Unable to enter workspace", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function renderProgress() {
    return (
      <View style={styles.progressRow}>
        {stepOrder.map((item) => {
          const active = item === step;
          const complete = stepIndex(item) < stepIndex(step);
          return (
            <View
              key={item}
              style={[
                styles.progressDot,
                active ? styles.progressDotActive : undefined,
                complete ? styles.progressDotComplete : undefined
              ]}
            />
          );
        })}
      </View>
    );
  }

  function renderGitHubStep() {
    return (
      <View>
        <BrandArtwork />
        <Text style={styles.bodyCopy}>
          GitHub is the only required connection up front. Once that is in place, Vibex can list
          your repos, create a fresh starter repo, and route you into a workspace immediately.
        </Text>
        <ActionButton
          label={connecting ? "Connecting GitHub..." : "Continue with GitHub"}
          onPress={handleGitHubConnect}
          icon={<FolderGit2 color="#091018" size={18} />}
        />
      </View>
    );
  }

  function renderOpenAIStep() {
    return (
      <View>
        <EngineFactSheet />
        <Text style={styles.bodyCopy}>
          Vibex uses your key only for backend model calls. It never changes the GitHub auth
          flow, and you can update or clear it later from workspace settings.
        </Text>
        <TextInput
          value={openaiApiKey}
          onChangeText={setOpenaiApiKey}
          placeholder="sk-proj-..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
        />
        <ActionButton
          label={savingOpenAIKey ? "Saving key..." : "Save OpenAI key and continue"}
          onPress={() => void handleSaveOpenAIKey()}
          disabled={savingOpenAIKey}
        />
        <ActionButton
          label={savingOpenAIKey ? "Please wait..." : "Use backend key instead"}
          onPress={() => void handleSaveOpenAIKey(true)}
          secondary
          disabled={savingOpenAIKey}
        />
      </View>
    );
  }

  function renderRepoModeTabs() {
    return (
      <View style={styles.modeTabs}>
        {(["existing", "new"] as RepoMode[]).map((mode) => {
          const selected = repoMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => setRepoMode(mode)}
              style={[styles.modeTab, selected ? styles.modeTabSelected : undefined]}
            >
              <Text style={[styles.modeTabText, selected ? styles.modeTabTextSelected : undefined]}>
                {mode === "existing" ? "Existing repo" : "Create repo"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderOwnerSelector() {
    return (
      <View style={styles.ownerGrid}>
        {owners.map((owner) => {
          const selected = owner.login === selectedOwner?.login;
          return (
            <Pressable
              key={`${owner.type}-${owner.login}`}
              onPress={() => setSelectedOwner(owner)}
              style={[styles.ownerChip, selected ? styles.ownerChipSelected : undefined]}
            >
              <Text style={[styles.ownerText, selected ? styles.ownerTextSelected : undefined]}>
                {owner.login}
              </Text>
              <Text style={styles.ownerMeta}>{owner.type}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderRepoStep() {
    return (
      <View>
        <View style={styles.headerCard}>
          <Text style={styles.headerCardTitle}>Repo source</Text>
          <Text style={styles.headerCardCopy}>
            Use an existing repository or create a private starter repo with a seeded Next.js site.
          </Text>
        </View>
        {renderRepoModeTabs()}
        <Text style={styles.sectionLabel}>Owner</Text>
        {renderOwnerSelector()}
        {repoMode === "existing" ? (
          <View style={styles.section}>
            {loadingRepos ? <ActivityIndicator color={colors.accentWarm} /> : null}
            {!groupedRepos.length && !loadingRepos ? (
              <Text style={styles.bodyCopy}>
                No repositories loaded for this owner yet. Switch to create mode to start from a new
                repo.
              </Text>
            ) : null}
            {groupedRepos.map((group) => (
              <View key={group.ownerLogin} style={styles.section}>
                <Text style={styles.sectionLabel}>
                  {group.ownerLogin} | {group.ownerType}
                </Text>
                {group.repos.map((repo) => {
                  const selected = selectedRepo?.fullName === repo.fullName;
                  return (
                    <Pressable
                      key={repo.fullName}
                      onPress={() => selectRepo(repo)}
                      style={[styles.row, selected ? styles.rowSelected : undefined]}
                    >
                      <Text style={styles.rowTitle}>{repo.repoName}</Text>
                      <Text style={styles.rowMeta}>{repo.fullName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <TextInput
              value={newRepoName}
              onChangeText={setNewRepoName}
              placeholder="Repository name"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={newRepoDescription}
              onChangeText={setNewRepoDescription}
              placeholder="Optional description"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <View style={styles.modeTabs}>
              {(["private", "public"] as const).map((visibility) => {
                const selected = newRepoVisibility === visibility;
                return (
                  <Pressable
                    key={visibility}
                    onPress={() => setNewRepoVisibility(visibility)}
                    style={[styles.modeTab, selected ? styles.modeTabSelected : undefined]}
                  >
                    <Text
                      style={[styles.modeTabText, selected ? styles.modeTabTextSelected : undefined]}
                    >
                      {visibility}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <ActionButton
              label={creatingRepo ? "Creating starter repo..." : "Create repo and continue"}
              onPress={handleCreateRepo}
              disabled={!selectedOwner || !newRepoName.trim() || creatingRepo}
              icon={<Plus color="#091018" size={18} />}
            />
          </View>
        )}
      </View>
    );
  }

  function renderWorkspaceStep() {
    return (
      <View>
        <View style={styles.headerCard}>
          <Text style={styles.headerCardTitle}>{selectedRepo?.fullName || "Workspace ready"}</Text>
          <Text style={styles.headerCardCopy}>
            Vibex will seed a default component rule automatically. Voice requests become
            transcripts before the model sees them, image and URL inputs become visual references,
            and confirmation turns the spec into a GitHub commit. You can add deeper skills, MCP
            context, and agents instructions after you enter the workspace.
          </Text>
        </View>
        <TextInput
          value={projectTitle}
          onChangeText={setProjectTitle}
          placeholder="Workspace title"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={branch}
          onChangeText={setBranch}
          placeholder="main"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          style={styles.input}
        />
        <ActionButton
          label={saving ? "Entering Vibex..." : "Enter workspace"}
          onPress={handleEnterWorkspace}
          disabled={!selectedRepo || saving}
        />
      </View>
    );
  }

  return (
    <StudioShell
      eyebrow={currentStep.eyebrow}
      title={currentStep.title}
      subtitle={currentStep.subtitle}
      keyboardAware
      headerRight={
        <View style={styles.headerRight}>
          {step !== "github" ? (
            <Pressable
              onPress={() => setStep(stepOrder[Math.max(0, stepIndex(step) - 1)] || "github")}
              style={styles.iconButton}
            >
              <ChevronLeft color={colors.text} size={18} />
            </Pressable>
          ) : null}
          <Text style={styles.stepCounter}>{stepIndex(step) + 1}/4</Text>
        </View>
      }
    >
      {renderProgress()}
      {session && existingProjectCount ? (
        <ActionButton
          label={`Open ${existingProjectCount} existing workspace${existingProjectCount > 1 ? "s" : ""}`}
          onPress={() => router.push("/projects")}
          secondary
        />
      ) : null}
      {step === "github" ? renderGitHubStep() : null}
      {step === "openai" ? renderOpenAIStep() : null}
      {step === "repo" ? renderRepoStep() : null}
      {step === "workspace" ? renderWorkspaceStep() : null}
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
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
  stepCounter: {
    color: colors.muted,
    fontFamily: "DMSansMedium",
    fontSize: 13
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.lg
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  progressDotActive: {
    backgroundColor: colors.accentWarm
  },
  progressDotComplete: {
    backgroundColor: colors.accent
  },
  bodyCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: spacing.lg
  },
  section: {
    marginTop: spacing.md
  },
  sectionLabel: {
    color: colors.accentWarm,
    fontFamily: "DMSansMedium",
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm
  },
  headerCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  headerCardTitle: {
    color: colors.text,
    fontFamily: "SpaceGroteskBold",
    fontSize: 22,
    marginBottom: 8
  },
  headerCardCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 14,
    lineHeight: 22
  },
  inlineActions: {
    marginTop: spacing.md
  },
  modeTabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.md
  },
  modeTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft
  },
  modeTabSelected: {
    backgroundColor: "rgba(143, 232, 255, 0.12)",
    borderColor: "rgba(143, 232, 255, 0.28)"
  },
  modeTabText: {
    color: colors.muted,
    fontFamily: "DMSansMedium",
    fontSize: 14
  },
  modeTabTextSelected: {
    color: colors.text
  },
  ownerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: spacing.md
  },
  ownerChip: {
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft
  },
  ownerChipSelected: {
    backgroundColor: "rgba(215, 255, 111, 0.08)",
    borderColor: "rgba(215, 255, 111, 0.28)"
  },
  ownerText: {
    color: colors.text,
    fontFamily: "DMSansMedium",
    fontSize: 14
  },
  ownerTextSelected: {
    color: colors.text
  },
  ownerMeta: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 12,
    marginTop: 4
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md
  },
  rowSelected: {
    borderBottomColor: colors.accent
  },
  rowTitle: {
    color: colors.text,
    fontFamily: "DMSansMedium",
    fontSize: 16
  },
  rowMeta: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 14,
    marginTop: 6
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
  }
});
