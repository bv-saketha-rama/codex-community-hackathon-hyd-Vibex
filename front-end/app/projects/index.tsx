import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";

import { ActionButton } from "@/components/action-button";
import { StudioShell } from "@/components/studio-shell";
import { fetchProjects, isAuthError } from "@/lib/api";
import { signOut, useAppStore } from "@/store/app-store";
import { colors, spacing } from "@/theme/tokens";
import type { ProjectRecord } from "@/types";

function formatUpdatedAt(value: number) {
  return new Date(value).toLocaleString();
}

export default function ProjectsScreen() {
  const session = useAppStore((state) => state.session);
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (!session) {
      router.replace("/onboarding");
      return;
    }

    void (async () => {
      setLoadingProjects(true);
      try {
        const response = await fetchProjects(session.userId);
        setProjects(response.projects);
        if (!activeProjectId && response.projects[0]) {
          setActiveProjectId(response.projects[0]._id);
        }
      } catch (error) {
        if (isAuthError(error)) {
          void signOut();
          router.replace("/onboarding");
          return;
        }
        Alert.alert(
          "Unable to load workspaces",
          error instanceof Error ? error.message : "Check your connection and try again."
        );
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, [activeProjectId, session, setActiveProjectId]);

  if (!session) {
    return null;
  }

  return (
    <StudioShell
      eyebrow="Workspaces"
      title="Your Vibex workspaces"
      subtitle="Choose a repo-backed workspace, reopen old chats, or connect another GitHub project."
    >
      <ActionButton
        label="Connect another GitHub repo"
        onPress={() => router.push("/onboarding")}
        icon={<Plus color="#0A1021" size={18} />}
      />

      {loadingProjects ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accentWarm} />
          <Text style={styles.loadingCopy}>Loading your workspaces...</Text>
        </View>
      ) : null}

      {projects.map((project) => (
        <Pressable
          key={project._id}
          onPress={() => {
            setActiveProjectId(project._id);
            router.push(`/projects/${project._id}`);
          }}
          style={styles.projectRow}
        >
          <View style={styles.projectCopy}>
            <Text style={styles.projectTitle}>{project.title}</Text>
            <Text style={styles.projectMeta}>
              {project.ownerLogin} | {project.repoFullName} | {project.branch}
            </Text>
            <Text style={styles.projectMeta}>Updated {formatUpdatedAt(project.updatedAt)}</Text>
          </View>
          <ChevronRight color={colors.text} size={18} />
        </Pressable>
      ))}

      {!projects.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No workspaces yet</Text>
          <Text style={styles.emptyCopy}>
            Authenticate with GitHub, pick a repo, and create your first Vibex workspace.
          </Text>
        </View>
      ) : null}
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.lg
  },
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg
  },
  loadingCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 14
  },
  projectCopy: {
    flex: 1,
    paddingRight: spacing.md
  },
  projectTitle: {
    color: colors.text,
    fontFamily: "SpaceGroteskBold",
    fontSize: 22
  },
  projectMeta: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 14,
    marginTop: 6
  },
  empty: {
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: "SpaceGroteskBold",
    fontSize: 22,
    marginBottom: spacing.sm
  },
  emptyCopy: {
    color: colors.muted,
    fontFamily: "DMSans",
    fontSize: 15,
    lineHeight: 22
  }
});
