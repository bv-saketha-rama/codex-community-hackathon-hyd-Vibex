import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const upsertByGithub = mutation({
  args: {
    userId: v.string(),
    githubToken: v.string(),
    login: v.string(),
    avatarUrl: v.optional(v.string()),
    name: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .unique();

    const payload = {
      ...args,
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("users", payload);
  }
});

export const setStitchConnection = mutation({
  args: {
    userId: v.string(),
    stitchToken: v.string(),
    stitchProjectId: v.optional(v.string()),
    stitchProjectName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      stitchProjectId: args.stitchProjectId,
      stitchProjectName: args.stitchProjectName,
      stitchToken: args.stitchToken,
      updatedAt: Date.now()
    });

    return existing._id;
  }
});

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .unique();
  }
});
