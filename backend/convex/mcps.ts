import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("mcpServers")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .collect();

    return items.sort((left, right) => right.updatedAt - left.updatedAt);
  }
});

export const saveMcp = mutation({
  args: {
    mcpId: v.optional(v.id("mcpServers")),
    userId: v.string(),
    projectId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    serverUrl: v.optional(v.string()),
    command: v.optional(v.string()),
    instructions: v.string(),
    enabled: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const payload = {
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

    if (args.mcpId) {
      await ctx.db.patch(args.mcpId, payload);
      return await ctx.db.get(args.mcpId);
    }

    const mcpId = await ctx.db.insert("mcpServers", payload);
    return await ctx.db.get(mcpId);
  }
});

export const setMcpEnabled = mutation({
  args: {
    mcpId: v.id("mcpServers"),
    enabled: v.boolean()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.mcpId, {
      enabled: args.enabled,
      updatedAt: Date.now()
    });
    return await ctx.db.get(args.mcpId);
  }
});

export const removeMcp = mutation({
  args: {
    mcpId: v.id("mcpServers")
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.mcpId);
    return args.mcpId;
  }
});
