import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

import type {
  AgentDocRecord,
  ConversationMessage,
  ConversationRecord,
  ConversationSpec,
  JobStatus,
  McpServerRecord,
  ProjectRecord,
  RepoSelection,
  SkillRecord,
  SkillScope,
  SkillSource,
  UserSession
} from "@/contracts";
import type { Env } from "@/env";

type MemoryUser = UserSession;
type MemoryJob = {
  _id: string;
  userId: string;
  projectId?: string;
  conversationId?: string;
  repo?: RepoSelection;
  status: JobStatus;
  phase?: string;
  message: string;
  commitSha?: string;
  deployUrl?: string;
  commitUrl?: string;
  errorCode?: string;
  createdAt: number;
};

function createMemoryConvex() {
  const users = new Map<string, MemoryUser>();
  const skills = new Map<string, SkillRecord>();
  const mcps = new Map<string, McpServerRecord>();
  const jobs = new Map<string, MemoryJob>();
  const projects = new Map<string, ProjectRecord>();
  const conversations = new Map<string, ConversationRecord>();
  const agentDocs = new Map<string, AgentDocRecord>();
  let counter = 0;

  const nextId = (prefix: string) => `${prefix}_${++counter}`;

  return {
    async listProjects(userId: string) {
      return [...projects.values()]
        .filter((project) => project.userId === userId)
        .sort((left, right) => right.updatedAt - left.updatedAt);
    },
    async getProject(projectId: string) {
      return projects.get(projectId);
    },
    async upsertProject(args: {
      projectId?: string;
      userId: string;
      title: string;
      repoFullName: string;
      repoName: string;
      ownerLogin: string;
      ownerType: "user" | "organization";
      ownerAvatarUrl?: string;
      branch: string;
      vercelUrl?: string;
    }) {
      const existing =
        (args.projectId ? projects.get(args.projectId) : undefined) ||
        [...projects.values()].find(
          (project) =>
            project.userId === args.userId && project.repoFullName === args.repoFullName
        );
      const now = Date.now();
      const record: ProjectRecord = {
        _id: existing?._id || args.projectId || nextId("project"),
        userId: args.userId,
        title: args.title,
        repoFullName: args.repoFullName,
        repoName: args.repoName,
        ownerLogin: args.ownerLogin,
        ownerType: args.ownerType,
        ownerAvatarUrl: args.ownerAvatarUrl,
        branch: args.branch,
        vercelUrl: args.vercelUrl,
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };
      projects.set(record._id, record);
      return record;
    },
    async listConversations(projectId: string) {
      return [...conversations.values()]
        .filter((conversation) => conversation.projectId === projectId)
        .sort((left, right) => right.updatedAt - left.updatedAt);
    },
    async getConversation(conversationId: string) {
      return conversations.get(conversationId);
    },
    async createConversation(args: {
      userId: string;
      projectId: string;
      title: string;
    }) {
      const now = Date.now();
      const record: ConversationRecord = {
        _id: nextId("conversation"),
        userId: args.userId,
        projectId: args.projectId,
        title: args.title,
        messages: [],
        createdAt: now,
        updatedAt: now
      };
      conversations.set(record._id, record);
      return record;
    },
    async saveConversation(args: {
      conversationId: string;
      messages: ConversationMessage[];
      spec?: ConversationSpec;
      title?: string;
    }) {
      const existing = conversations.get(args.conversationId);
      if (!existing) {
        return undefined;
      }

      const nextValue: ConversationRecord = {
        ...existing,
        messages: args.messages,
        spec: args.spec,
        title: args.title || existing.title,
        updatedAt: Date.now()
      };
      conversations.set(args.conversationId, nextValue);
      return nextValue;
    },
    async renameConversation(args: { conversationId: string; title: string }) {
      const existing = conversations.get(args.conversationId);
      if (!existing) {
        return undefined;
      }
      const nextValue: ConversationRecord = {
        ...existing,
        title: args.title,
        updatedAt: Date.now()
      };
      conversations.set(args.conversationId, nextValue);
      return nextValue;
    },
    async listSkills(userId: string) {
      return [...skills.values()]
        .filter((skill) => skill.userId === userId)
        .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
    },
    async saveSkill(args: {
      userId: string;
      projectId?: string;
      scope: SkillScope;
      name: string;
      content: string;
      source: SkillSource;
      enabled?: boolean;
      skillId?: string;
    }) {
      const id = args.skillId || nextId("skill");
      const record: SkillRecord = {
        _id: id,
        userId: args.userId,
        projectId: args.projectId,
        scope: args.scope,
        name: args.name,
        content: args.content,
        source: args.source,
        enabled: args.enabled ?? true,
        updatedAt: Date.now()
      };
      skills.set(id, record);
      return record;
    },
    async removeSkill(skillId: string) {
      skills.delete(skillId);
    },
    async setSkillEnabled(skillId: string, enabled: boolean) {
      const current = skills.get(skillId);
      if (current) {
        const nextValue = {
          ...current,
          enabled,
          updatedAt: Date.now()
        };
        skills.set(skillId, nextValue);
        return nextValue;
      }
      return current;
    },
    async listMcps(userId: string) {
      return [...mcps.values()]
        .filter((mcp) => mcp.userId === userId)
        .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));
    },
    async saveMcp(args: {
      userId: string;
      projectId?: string;
      name: string;
      description?: string;
      serverUrl?: string;
      command?: string;
      instructions: string;
      enabled?: boolean;
      mcpId?: string;
    }) {
      const id = args.mcpId || nextId("mcp");
      const record: McpServerRecord = {
        _id: id,
        userId: args.userId,
        projectId: args.projectId,
        name: args.name,
        description: args.description,
        serverUrl: args.serverUrl,
        command: args.command,
        instructions: args.instructions,
        enabled: args.enabled ?? true,
        updatedAt: Date.now()
      };
      mcps.set(id, record);
      return record;
    },
    async removeMcp(mcpId: string) {
      mcps.delete(mcpId);
    },
    async setMcpEnabled(mcpId: string, enabled: boolean) {
      const current = mcps.get(mcpId);
      if (current) {
        const nextValue = {
          ...current,
          enabled,
          updatedAt: Date.now()
        };
        mcps.set(mcpId, nextValue);
        return nextValue;
      }
      return current;
    },
    async getAgentDoc(projectId: string) {
      return [...agentDocs.values()].find((record) => record.projectId === projectId);
    },
    async saveAgentDoc(args: {
      userId: string;
      projectId: string;
      content: string;
      enabled: boolean;
    }) {
      const existing = [...agentDocs.values()].find(
        (record) => record.projectId === args.projectId
      );
      const record: AgentDocRecord = {
        _id: existing?._id || nextId("agent"),
        userId: args.userId,
        projectId: args.projectId,
        content: args.content,
        enabled: args.enabled,
        updatedAt: Date.now()
      };
      agentDocs.set(record._id, record);
      return record;
    },
    async upsertUser(session: UserSession) {
      users.set(session.userId, session);
      return session;
    },
    async setStitchConnection(args: {
      userId: string;
      stitchToken: string;
      stitchProjectId?: string;
      stitchProjectName?: string;
    }) {
      const user = users.get(args.userId);
      if (user) {
        users.set(args.userId, {
          ...user,
          stitchToken: args.stitchToken,
          stitchProjectId: args.stitchProjectId,
          stitchProjectName: args.stitchProjectName
        });
      }
    },
    async createJob(args: {
      userId: string;
      projectId?: string;
      conversationId?: string;
      repo?: RepoSelection;
      message: string;
    }) {
      const id = nextId("job");
      const job: MemoryJob = {
        _id: id,
        userId: args.userId,
        projectId: args.projectId,
        conversationId: args.conversationId,
        repo: args.repo,
        status: "queued",
        message: args.message,
        createdAt: Date.now()
      };
      jobs.set(id, job);
      return id;
    },
    async updateJob(args: Partial<MemoryJob> & { jobId: string }) {
      const existing = jobs.get(args.jobId);
      if (!existing) {
        return;
      }
      jobs.set(args.jobId, { ...existing, ...args, _id: args.jobId });
    }
  };
}

export function createConvexService(env: Env) {
  if (!env.CONVEX_URL) {
    return createMemoryConvex();
  }

  const client = new ConvexHttpClient(env.CONVEX_URL);
  const api = anyApi;

  async function getProject(projectId: string) {
    return (await client.query(api.projects.getById, { projectId })) as ProjectRecord | null;
  }

  async function getConversation(conversationId: string) {
    return (await client.query(api.conversations.getById, {
      conversationId
    })) as ConversationRecord | null;
  }

  return {
    async listProjects(userId: string) {
      return (await client.query(api.projects.listForUser, { userId })) as ProjectRecord[];
    },
    getProject,
    async upsertProject(args: {
      projectId?: string;
      userId: string;
      title: string;
      repoFullName: string;
      repoName: string;
      ownerLogin: string;
      ownerType: "user" | "organization";
      ownerAvatarUrl?: string;
      branch: string;
      vercelUrl?: string;
    }) {
      return (await client.mutation(api.projects.upsertProject, args)) as ProjectRecord;
    },
    async listConversations(projectId: string) {
      return (await client.query(api.conversations.listForProject, {
        projectId
      })) as ConversationRecord[];
    },
    getConversation,
    async createConversation(args: {
      userId: string;
      projectId: string;
      title: string;
    }) {
      const conversationId = (await client.mutation(api.conversations.createConversation, {
        userId: args.userId,
        projectId: args.projectId,
        title: args.title
      })) as string;

      return await getConversation(conversationId);
    },
    async saveConversation(args: {
      conversationId: string;
      messages: ConversationMessage[];
      spec?: ConversationSpec;
      title?: string;
    }) {
      return (await client.mutation(api.conversations.saveConversation, args)) as ConversationRecord;
    },
    async renameConversation(args: { conversationId: string; title: string }) {
      return (await client.mutation(api.conversations.renameConversation, args)) as ConversationRecord;
    },
    async listSkills(userId: string) {
      return (await client.query(api.skills.listForUser, { userId })) as SkillRecord[];
    },
    async saveSkill(args: {
      userId: string;
      projectId?: string;
      scope: SkillScope;
      name: string;
      content: string;
      source: SkillSource;
      enabled?: boolean;
      skillId?: string;
    }) {
      return (await client.mutation(api.skills.saveSkill, args)) as SkillRecord;
    },
    async removeSkill(skillId: string) {
      await client.mutation(api.skills.removeSkill, { skillId });
    },
    async setSkillEnabled(skillId: string, enabled: boolean) {
      return (await client.mutation(api.skills.setSkillEnabled, { skillId, enabled })) as SkillRecord;
    },
    async listMcps(userId: string) {
      return (await client.query(api.mcps.listForUser, { userId })) as McpServerRecord[];
    },
    async saveMcp(args: {
      userId: string;
      projectId?: string;
      name: string;
      description?: string;
      serverUrl?: string;
      command?: string;
      instructions: string;
      enabled?: boolean;
      mcpId?: string;
    }) {
      return (await client.mutation(api.mcps.saveMcp, args)) as McpServerRecord;
    },
    async removeMcp(mcpId: string) {
      await client.mutation(api.mcps.removeMcp, { mcpId });
    },
    async setMcpEnabled(mcpId: string, enabled: boolean) {
      return (await client.mutation(api.mcps.setMcpEnabled, { mcpId, enabled })) as McpServerRecord;
    },
    async getAgentDoc(projectId: string) {
      return (await client.query(api.agentDocs.getForProject, {
        projectId
      })) as AgentDocRecord | null;
    },
    async saveAgentDoc(args: {
      userId: string;
      projectId: string;
      content: string;
      enabled: boolean;
    }) {
      return (await client.mutation(api.agentDocs.upsertForProject, args)) as AgentDocRecord;
    },
    async upsertUser(session: UserSession) {
      await client.mutation(api.users.upsertByGithub, session);
      return session;
    },
    async setStitchConnection(args: {
      userId: string;
      stitchToken: string;
      stitchProjectId?: string;
      stitchProjectName?: string;
    }) {
      await client.mutation(api.users.setStitchConnection, args);
    },
    async createJob(args: {
      userId: string;
      projectId?: string;
      conversationId?: string;
      repo?: RepoSelection;
      message: string;
    }) {
      return (await client.mutation(api.jobs.createJob, args)) as string;
    },
    async updateJob(args: {
      jobId: string;
      status?: JobStatus;
      phase?: string;
      message?: string;
      commitSha?: string;
      commitUrl?: string;
      deployUrl?: string;
      errorCode?: string;
    }) {
      await client.mutation(api.jobs.updateJobStatus, args);
    }
  };
}
