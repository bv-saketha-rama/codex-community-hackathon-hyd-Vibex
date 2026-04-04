import { Platform } from "react-native";

import type {
  AgentDocRecord,
  Attachment,
  ConversationMessage,
  ConversationRecord,
  ConversationSpec,
  MarketplaceSkill,
  McpServerRecord,
  ProjectRecord,
  RepoOwner,
  RepoOwnerType,
  RepoSelection,
  RepoVisibility,
  SkillRecord,
} from "@/types";

export function getApiBaseUrl() {
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_WEB_API_URL || "http://localhost:8787";
  }

  return process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";
}

export function isAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("bad credentials") ||
    normalized.includes("unauthorized") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("401")
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
        }
      | null;
    throw new Error(payload?.error || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchRepos(token: string) {
  return request<{ repos: RepoSelection[]; owners: RepoOwner[] }>(
    `/repos?token=${encodeURIComponent(token)}`
  );
}

export async function createRepo(payload: {
  token: string;
  ownerLogin: string;
  ownerType: RepoOwnerType;
  repoName: string;
  description?: string;
  visibility?: RepoVisibility;
}) {
  return request<{ repo: RepoSelection }>("/repos", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchProjects(userId: string) {
  return request<{ projects: ProjectRecord[] }>(`/projects?userId=${encodeURIComponent(userId)}`);
}

export async function fetchProject(projectId: string) {
  return request<{ project: ProjectRecord }>(`/projects/${projectId}`);
}

export async function createProject(payload: {
  userId: string;
  title?: string;
  repo: RepoSelection;
}) {
  return request<{ project: ProjectRecord }>("/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateProject(
  projectId: string,
  payload: {
    title?: string;
    branch?: string;
    vercelUrl?: string;
  }
) {
  return request<{ project: ProjectRecord }>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function fetchProjectConversations(projectId: string) {
  return request<{ conversations: ConversationRecord[] }>(
    `/projects/${projectId}/conversations`
  );
}

export async function createConversation(payload: {
  userId: string;
  projectId: string;
  title?: string;
}) {
  return request<{ conversation: ConversationRecord }>(
    `/projects/${payload.projectId}/conversations`,
    {
      method: "POST",
      body: JSON.stringify({
        userId: payload.userId,
        title: payload.title
      })
    }
  );
}

export async function fetchConversation(conversationId: string) {
  return request<{ conversation: ConversationRecord }>(`/conversations/${conversationId}`);
}

export async function renameConversation(conversationId: string, title: string) {
  return request<{ conversation: ConversationRecord }>(`/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title })
  });
}

export async function fetchSkills(userId: string) {
  return request<{ skills: SkillRecord[] }>(`/skills?userId=${encodeURIComponent(userId)}`);
}

export async function saveSkill(payload: {
  userId: string;
  projectId?: string;
  scope: "user" | "project";
  name: string;
  content: string;
  source: "default" | "marketplace" | "custom";
  enabled?: boolean;
}) {
  return request<{ skill: SkillRecord }>("/skills", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSkill(
  skillId: string,
  userId: string,
  payload: {
    projectId?: string;
    scope?: "user" | "project";
    name?: string;
    content?: string;
    source?: "default" | "marketplace" | "custom";
    enabled?: boolean;
  }
) {
  return request<{ skill: SkillRecord }>(
    `/skills/${skillId}?userId=${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
}

export async function deleteSkill(skillId: string) {
  return request<{ ok: boolean }>(`/skills/${skillId}`, {
    method: "DELETE"
  });
}

export async function fetchMarketplaceSkills() {
  return request<{ skills: MarketplaceSkill[] }>("/skills/marketplace");
}

export async function fetchMcps(userId: string) {
  return request<{ mcps: McpServerRecord[] }>(`/mcps?userId=${encodeURIComponent(userId)}`);
}

export async function saveMcp(payload: {
  userId: string;
  projectId?: string;
  name: string;
  description?: string;
  serverUrl?: string;
  command?: string;
  instructions: string;
  enabled?: boolean;
}) {
  return request<{ mcp: McpServerRecord }>("/mcps", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateMcp(
  mcpId: string,
  userId: string,
  payload: {
    projectId?: string;
    name?: string;
    description?: string;
    serverUrl?: string;
    command?: string;
    instructions?: string;
    enabled?: boolean;
  }
) {
  return request<{ mcp: McpServerRecord }>(
    `/mcps/${mcpId}?userId=${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
}

export async function deleteMcp(mcpId: string) {
  return request<{ ok: boolean }>(`/mcps/${mcpId}`, {
    method: "DELETE"
  });
}

export async function fetchAgentDoc(projectId: string) {
  return request<{ agentDoc: AgentDocRecord | null }>(`/projects/${projectId}/agent-doc`);
}

export async function saveAgentDoc(
  projectId: string,
  payload: {
    userId: string;
    content: string;
    enabled: boolean;
  }
) {
  return request<{ agentDoc: AgentDocRecord }>(`/projects/${projectId}/agent-doc`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function captureReferenceUrl(url: string) {
  return request<{ image_base64: string }>("/screenshot", {
    method: "POST",
    body: JSON.stringify({ url })
  });
}

export async function sendConversation(payload: {
  userId?: string;
  projectId?: string;
  conversationId?: string;
  messages: ConversationMessage[];
  attachments?: Attachment[];
  input: string;
  audio_base64?: string;
  image_base64?: string;
  repo: string;
  branch: string;
  token: string;
  openai_api_key?: string;
  skills?: string[];
}) {
  return request<{
    reply: string;
    ready_to_confirm: boolean;
    spec: ConversationSpec;
    followUpCount: number;
  }>("/conversation", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function confirmConversation(payload: {
  userId: string;
  projectId?: string;
  conversationId?: string;
  jobId?: string;
  spec: ConversationSpec;
  repo: string;
  branch: string;
  token: string;
  openai_api_key?: string;
  image_base64?: string;
}) {
  return request<{ jobId: string; commitSha?: string }>("/confirm", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
