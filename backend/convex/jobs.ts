import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const createJob = mutation({
  args: {
    userId: v.string(),
    projectId: v.optional(v.string()),
    conversationId: v.optional(v.string()),
    repo: v.optional(v.any()),
    message: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", {
      userId: args.userId,
      projectId: args.projectId,
      conversationId: args.conversationId,
      repo: args.repo,
      status: "queued",
      message: args.message,
      createdAt: Date.now()
    });
  }
});

export const updateJobStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: v.optional(v.string()),
    phase: v.optional(v.string()),
    message: v.optional(v.string()),
    commitSha: v.optional(v.string()),
    commitUrl: v.optional(v.string()),
    deployUrl: v.optional(v.string()),
    errorCode: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { jobId, ...rest } = args;
    await ctx.db.patch(jobId, rest);
    return jobId;
  }
});

export const getById = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  }
});

export const getLatestForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .order("desc")
      .first();
  }
});
