import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const getForProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentDocs")
      .withIndex("by_projectId", (queryBuilder) => queryBuilder.eq("projectId", args.projectId))
      .unique();
  }
});

export const upsertForProject = mutation({
  args: {
    userId: v.string(),
    projectId: v.string(),
    content: v.string(),
    enabled: v.boolean()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentDocs")
      .withIndex("by_projectId", (queryBuilder) => queryBuilder.eq("projectId", args.projectId))
      .unique();

    const payload = {
      userId: args.userId,
      projectId: args.projectId,
      content: args.content,
      enabled: args.enabled,
      updatedAt: Date.now()
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return await ctx.db.get(existing._id);
    }

    const recordId = await ctx.db.insert("agentDocs", payload);
    return await ctx.db.get(recordId);
  }
});
