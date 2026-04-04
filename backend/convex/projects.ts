import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("projects")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .collect();

    return items.sort((left, right) => right.updatedAt - left.updatedAt);
  }
});

export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  }
});

export const upsertProject = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    userId: v.string(),
    title: v.string(),
    repoFullName: v.string(),
    repoName: v.string(),
    ownerLogin: v.string(),
    ownerType: v.string(),
    ownerAvatarUrl: v.optional(v.string()),
    branch: v.string(),
    vercelUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const payload = {
      userId: args.userId,
      title: args.title,
      repoFullName: args.repoFullName,
      repoName: args.repoName,
      ownerLogin: args.ownerLogin,
      ownerType: args.ownerType,
      ownerAvatarUrl: args.ownerAvatarUrl,
      branch: args.branch,
      vercelUrl: args.vercelUrl,
      updatedAt: now
    };

    if (args.projectId) {
      await ctx.db.patch(args.projectId, payload);
      return await ctx.db.get(args.projectId);
    }

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_userId_repoFullName", (queryBuilder) =>
        queryBuilder.eq("userId", args.userId).eq("repoFullName", args.repoFullName)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return await ctx.db.get(existing._id);
    }

    const projectId = await ctx.db.insert("projects", {
      ...payload,
      createdAt: now
    });
    return await ctx.db.get(projectId);
  }
});
