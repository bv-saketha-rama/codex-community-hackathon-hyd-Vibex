export type InputMode = "voice" | "image" | "url" | "text";

export type MessageRole = "user" | "assistant" | "system";

export type JobStatus =
  | "drafting"
  | "clarifying"
  | "ready"
  | "queued"
  | "generating"
  | "pushing"
  | "deploying"
  | "live"
  | "failed";

export type SkillSource = "default" | "marketplace" | "custom";

export type SkillScope = "user" | "project";

export type RepoOwnerType = "user" | "organization";
export type RepoVisibility = "private" | "public";

export interface Attachment {
  kind: "image" | "url" | "audio";
  label?: string;
  value: string;
}

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  inputType: InputMode;
  attachments: Attachment[];
  createdAt: string;
}

export interface ConversationSpec {
  summary: string;
  goals: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  targetPaths: string[];
  designNotes: string[];
}

export interface SessionUser {
  userId: string;
  githubToken: string;
  login: string;
  avatarUrl?: string;
  name?: string;
  openaiApiKey?: string;
}

export interface RepoSelection {
  fullName: string;
  repoName: string;
  ownerLogin: string;
  ownerType: RepoOwnerType;
  ownerAvatarUrl?: string;
  branch: string;
  vercelUrl?: string;
}

export interface RepoOwner {
  login: string;
  type: RepoOwnerType;
  avatarUrl?: string;
}

export interface ProjectRecord {
  _id: string;
  userId: string;
  title: string;
  repoFullName: string;
  repoName: string;
  ownerLogin: string;
  ownerType: RepoOwnerType;
  ownerAvatarUrl?: string;
  branch: string;
  vercelUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationRecord {
  _id: string;
  userId: string;
  projectId: string;
  title: string;
  messages: ConversationMessage[];
  spec?: ConversationSpec;
  createdAt: number;
  updatedAt: number;
}

export interface MarketplaceSkill {
  id: string;
  name: string;
  description: string;
  author: string;
  content: string;
}

export interface SkillRecord {
  _id?: string;
  userId?: string;
  projectId?: string;
  scope: SkillScope;
  name: string;
  content: string;
  source: SkillSource;
  enabled: boolean;
  updatedAt?: number;
}

export interface McpServerRecord {
  _id?: string;
  userId?: string;
  projectId?: string;
  name: string;
  description?: string;
  serverUrl?: string;
  command?: string;
  instructions: string;
  enabled: boolean;
  updatedAt?: number;
}

export interface AgentDocRecord {
  _id?: string;
  userId?: string;
  projectId: string;
  content: string;
  enabled: boolean;
  updatedAt?: number;
}

export interface JobRecord {
  _id?: string;
  userId?: string;
  projectId?: string;
  conversationId?: string;
  status: JobStatus;
  phase?: string;
  message: string;
  commitSha?: string;
  commitUrl?: string;
  deployUrl?: string;
  errorCode?: string;
}

export type NotificationTone = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  tone: NotificationTone;
}
