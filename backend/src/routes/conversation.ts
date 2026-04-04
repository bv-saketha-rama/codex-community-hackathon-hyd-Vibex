import type { Hono } from "hono";
import { z } from "zod";

import type { Services } from "@/services";
import { createConversationTitle, countClarificationReplies, inferInputType } from "@/lib/utils";

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

const conversationSchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  messages: z.array(messageSchema).default([]),
  attachments: z
    .array(
      z.object({
        kind: z.enum(["image", "url", "audio"]),
        label: z.string().optional(),
        value: z.string()
      })
    )
    .default([]),
  input: z.string(),
  audio_base64: z.string().optional(),
  image_base64: z.string().optional(),
  repo: z.string(),
  branch: z.string(),
  token: z.string(),
  openai_api_key: z.string().optional(),
  skills: z.array(z.string()).default([])
});

export function registerConversationRoutes(app: Hono, services: Services) {
  app.post("/conversation", async (c) => {
    const body = conversationSchema.parse(await c.req.json());
    const repoSnapshot = await services.github.fetchRepoSnapshot(body.token, body.repo, body.branch);
    const followUpCount = countClarificationReplies(body.messages);
    const voiceTranscript = body.audio_base64
      ? await services.openai.transcribeAudio(body.audio_base64, body.openai_api_key)
      : "";
    const effectiveInput = voiceTranscript || body.input;
    const skillBundle = await services.skills.composeSkillBundle({
      userId: body.userId,
      projectId: body.projectId,
      repoSnapshot,
      providedSkills: body.skills,
      messages: body.messages
    });

    const reply = await services.openai.generateConversation({
      input: effectiveInput,
      messages: body.messages.map((message) => `${message.role}: ${message.content}`).join("\n"),
      followUpCount,
      repoSnapshot,
      skillPrompt: skillBundle.prompt,
      imageBase64: body.image_base64,
      openaiApiKey: body.openai_api_key
    });

    const userMessage = {
      role: "user" as const,
      content: effectiveInput || "Voice request",
      inputType: inferInputType(body.audio_base64, body.image_base64, body.input),
      attachments: body.attachments,
      createdAt: new Date().toISOString()
    };
    const assistantMessage = {
      role: "assistant" as const,
      content: reply.reply,
      inputType: "text" as const,
      attachments: [],
      createdAt: new Date().toISOString()
    };

    if (body.conversationId) {
      const current = await services.convex.getConversation(body.conversationId);
      const currentTitle = current?.title || "New chat";
      const nextTitle =
        currentTitle === "New chat" && body.input.trim()
          ? createConversationTitle(body.input)
          : currentTitle;

      await services.convex.saveConversation({
        conversationId: body.conversationId,
        messages: [...body.messages, userMessage, assistantMessage],
        spec: reply.spec,
        title: nextTitle
      });
    }

    return c.json({
      reply: reply.reply,
      ready_to_confirm: reply.readyToConfirm,
      spec: reply.spec,
      followUpCount: reply.followUpCount
    });
  });
}
