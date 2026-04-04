import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listForProject = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("conversations")
      .withIndex("by_projectId", (queryBuilder) => queryBuilder.eq("projectId", args.projectId))
      .collect();

    return items.sort((left, right) => right.updatedAt - left.updatedAt);
  }
});

export const getById = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  }
});

export const createConversation = mutation({
  args: {
    userId: v.string(),
    projectId: v.string(),
    title: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("conversations", {
      userId: args.userId,
      projectId: args.projectId,
      title: args.title,
      messages: [],
      createdAt: now,
      updatedAt: now
    });
  }
});

export const saveConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    messages: v.array(v.any()),
    spec: v.optional(v.any()),
    title: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { conversationId, ...rest } = args;
    await ctx.db.patch(conversationId, {
      ...rest,
      updatedAt: Date.now()
    });
    return await ctx.db.get(conversationId);
  }
});

export const renameConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now()
    });
    return await ctx.db.get(args.conversationId);
  }
});
