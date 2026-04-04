import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agentDocs: defineTable({
    userId: v.string(),
    projectId: v.string(),
    content: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number()
  })
    .index("by_projectId", ["projectId"])
    .index("by_userId", ["userId"]),
  conversations: defineTable({
    userId: v.string(),
    projectId: v.string(),
    title: v.string(),
    messages: v.array(v.any()),
    spec: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_projectId", ["projectId"])
    .index("by_userId", ["userId"]),
  jobs: defineTable({
    userId: v.string(),
    projectId: v.optional(v.string()),
    conversationId: v.optional(v.string()),
    repo: v.optional(v.any()),
    status: v.string(),
    phase: v.optional(v.string()),
    message: v.string(),
    commitSha: v.optional(v.string()),
    commitUrl: v.optional(v.string()),
    deployUrl: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    createdAt: v.number()
  }).index("by_userId", ["userId"]),
  mcpServers: defineTable({
    userId: v.string(),
    projectId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    serverUrl: v.optional(v.string()),
    command: v.optional(v.string()),
    instructions: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number()
  })
    .index("by_userId", ["userId"])
    .index("by_projectId", ["projectId"]),
  projects: defineTable({
    userId: v.string(),
    title: v.string(),
    repoFullName: v.string(),
    repoName: v.string(),
    ownerLogin: v.string(),
    ownerType: v.string(),
    ownerAvatarUrl: v.optional(v.string()),
    branch: v.string(),
    vercelUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_userId", ["userId"])
    .index("by_userId_repoFullName", ["userId", "repoFullName"]),
  repos: defineTable({
    userId: v.string(),
    fullName: v.string(),
    branch: v.string(),
    vercelUrl: v.optional(v.string()),
    updatedAt: v.number()
  }).index("by_userId", ["userId"]),
  skills: defineTable({
    userId: v.string(),
    projectId: v.optional(v.string()),
    scope: v.string(),
    name: v.string(),
    content: v.string(),
    source: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number()
  })
    .index("by_userId", ["userId"])
    .index("by_projectId", ["projectId"]),
  users: defineTable({
    userId: v.string(),
    githubToken: v.string(),
    login: v.string(),
    avatarUrl: v.optional(v.string()),
    name: v.optional(v.string()),
    stitchToken: v.optional(v.string()),
    stitchProjectId: v.optional(v.string()),
    stitchProjectName: v.optional(v.string()),
    updatedAt: v.number()
  }).index("by_userId", ["userId"])
});
