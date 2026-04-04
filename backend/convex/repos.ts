import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const upsertRepo = mutation({
  args: {
    userId: v.string(),
    fullName: v.string(),
    branch: v.string(),
    vercelUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("repos")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .unique();

    const payload = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("repos", payload);
  }
});

export const getForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repos")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .unique();
  }
});
