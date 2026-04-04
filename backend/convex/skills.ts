import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("skills")
      .withIndex("by_userId", (queryBuilder) => queryBuilder.eq("userId", args.userId))
      .collect();

    return items.sort((left, right) => right.updatedAt - left.updatedAt);
  }
});

export const saveSkill = mutation({
  args: {
    skillId: v.optional(v.id("skills")),
    userId: v.string(),
    projectId: v.optional(v.string()),
    scope: v.string(),
    name: v.string(),
    content: v.string(),
    source: v.string(),
    enabled: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const payload = {
      userId: args.userId,
      projectId: args.projectId,
      scope: args.scope,
      name: args.name,
      content: args.content,
      source: args.source,
      enabled: args.enabled ?? true,
      updatedAt: Date.now()
    };

    if (args.skillId) {
      await ctx.db.patch(args.skillId, payload);
      return await ctx.db.get(args.skillId);
    }

    const skillId = await ctx.db.insert("skills", payload);
    return await ctx.db.get(skillId);
  }
});

export const setSkillEnabled = mutation({
  args: {
    skillId: v.id("skills"),
    enabled: v.boolean()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.skillId, {
      enabled: args.enabled,
      updatedAt: Date.now()
    });
    return await ctx.db.get(args.skillId);
  }
});

export const removeSkill = mutation({
  args: {
    skillId: v.id("skills")
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.skillId);
    return args.skillId;
  }
});
