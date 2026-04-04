import type { Hono } from "hono";
import { z } from "zod";

import type { ConversationSpec } from "@/contracts";
import type { Services } from "@/services";
import { createConversationTitle } from "@/lib/utils";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  inputType: z.enum(["voice", "image", "url", "text"]),
  attachments: z
    .array(
      z.object({
        kind: z.enum(["image", "url", "audio"]),
        label: z.string().optional(),
        value: z.string()
      })
    )
    .default([]),
  createdAt: z.string()
});

const specSchema = z.object({
  summary: z.string(),
  goals: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  targetPaths: z.array(z.string()).default([]),
  designNotes: z.array(z.string()).default([])
});

const repoContextSchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  messages: z.array(messageSchema).default([]),
  repo: z.string(),
  branch: z.string(),
  token: z.string(),
  skills: z.array(z.string()).default([])
});

const saveConversationSchema = z.object({
  conversationId: z.string(),
  messages: z.array(messageSchema),
  spec: specSchema.optional(),
  title: z.string().optional()
});

export function registerConversationRoutes(app: Hono, services: Services) {
  app.post("/repo-context", async (c) => {
    const body = repoContextSchema.parse(await c.req.json());
    const repoSnapshot = await services.github.fetchRepoSnapshot(body.token, body.repo, body.branch);
    const skillBundle = await services.skills.composeSkillBundle({
      userId: body.userId,
      projectId: body.projectId,
      repoSnapshot,
      providedSkills: body.skills,
      messages: body.messages
    });

    return c.json({
      repoSnapshot,
      skillPrompt: skillBundle.prompt
    });
  });

  app.post("/conversation", async (c) => {
    const body = saveConversationSchema.parse(await c.req.json());
    const current = await services.convex.getConversation(body.conversationId);
    if (!current) {
      return c.json({ error: "Conversation not found." }, 404);
    }

    const firstUserMessage = body.messages.find((message) => message.role === "user")?.content || "";
    const currentTitle = current.title || "New chat";
    const nextTitle =
      body.title ||
      (currentTitle === "New chat" && firstUserMessage.trim()
        ? createConversationTitle(firstUserMessage)
        : currentTitle);

    const savedConversation = await services.convex.saveConversation({
      conversationId: body.conversationId,
      messages: body.messages,
      spec: body.spec as ConversationSpec | undefined,
      title: nextTitle
    });

    return c.json({
      conversation: savedConversation
    });
  });
}
