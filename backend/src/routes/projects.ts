import type { Hono } from "hono";
import { z } from "zod";

import type { Services } from "@/services";
import { createConversationTitle } from "@/lib/utils";

const projectListQuery = z.object({
  userId: z.string()
});

const saveProjectSchema = z.object({
  userId: z.string(),
  title: z.string().optional(),
  repo: z.object({
    fullName: z.string(),
    repoName: z.string(),
    ownerLogin: z.string(),
    ownerType: z.enum(["user", "organization"]),
    ownerAvatarUrl: z.string().optional(),
    branch: z.string(),
    vercelUrl: z.string().optional()
  })
});

const updateProjectSchema = z.object({
  title: z.string().optional(),
  branch: z.string().optional(),
  vercelUrl: z.string().optional()
});

const createConversationSchema = z.object({
  userId: z.string(),
  title: z.string().optional()
});

const renameConversationSchema = z.object({
  title: z.string()
});

const saveAgentDocSchema = z.object({
  userId: z.string(),
  content: z.string(),
  enabled: z.boolean().default(true)
});

export function registerProjectRoutes(app: Hono, services: Services) {
  app.get("/projects", async (c) => {
    const query = projectListQuery.parse(c.req.query());
    const projects = await services.convex.listProjects(query.userId);
    return c.json({ projects });
  });

  app.post("/projects", async (c) => {
    const body = saveProjectSchema.parse(await c.req.json());
    const project = await services.convex.upsertProject({
      userId: body.userId,
      title: body.title || body.repo.repoName,
      repoFullName: body.repo.fullName,
      repoName: body.repo.repoName,
      ownerLogin: body.repo.ownerLogin,
      ownerType: body.repo.ownerType,
      ownerAvatarUrl: body.repo.ownerAvatarUrl,
      branch: body.repo.branch,
      vercelUrl: body.repo.vercelUrl
    });

    return c.json({ project });
  });

  app.get("/projects/:projectId", async (c) => {
    const project = await services.convex.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: "Project not found." }, 404);
    }
    return c.json({ project });
  });

  app.patch("/projects/:projectId", async (c) => {
    const projectId = c.req.param("projectId");
    const current = await services.convex.getProject(projectId);
    if (!current) {
      return c.json({ error: "Project not found." }, 404);
    }

    const body = updateProjectSchema.parse(await c.req.json());
    const project = await services.convex.upsertProject({
      projectId,
      userId: current.userId,
      title: body.title ?? current.title,
      repoFullName: current.repoFullName,
      repoName: current.repoName,
      ownerLogin: current.ownerLogin,
      ownerType: current.ownerType,
      ownerAvatarUrl: current.ownerAvatarUrl,
      branch: body.branch ?? current.branch,
      vercelUrl: body.vercelUrl ?? current.vercelUrl
    });

    return c.json({ project });
  });

  app.get("/projects/:projectId/conversations", async (c) => {
    const conversations = await services.convex.listConversations(c.req.param("projectId"));
    return c.json({ conversations });
  });

  app.post("/projects/:projectId/conversations", async (c) => {
    const projectId = c.req.param("projectId");
    const body = createConversationSchema.parse(await c.req.json());
    const conversation = await services.convex.createConversation({
      userId: body.userId,
      projectId,
      title: body.title || "New chat"
    });

    return c.json({ conversation });
  });

  app.get("/conversations/:conversationId", async (c) => {
    const conversation = await services.convex.getConversation(c.req.param("conversationId"));
    if (!conversation) {
      return c.json({ error: "Conversation not found." }, 404);
    }
    return c.json({ conversation });
  });

  app.patch("/conversations/:conversationId", async (c) => {
    const conversationId = c.req.param("conversationId");
    const body = renameConversationSchema.parse(await c.req.json());
    const conversation = await services.convex.renameConversation({
      conversationId,
      title: body.title || createConversationTitle(body.title)
    });

    if (!conversation) {
      return c.json({ error: "Conversation not found." }, 404);
    }

    return c.json({ conversation });
  });

  app.get("/projects/:projectId/agent-doc", async (c) => {
    const agentDoc = await services.convex.getAgentDoc(c.req.param("projectId"));
    return c.json({ agentDoc: agentDoc || null });
  });

  app.put("/projects/:projectId/agent-doc", async (c) => {
    const projectId = c.req.param("projectId");
    const body = saveAgentDocSchema.parse(await c.req.json());
    const agentDoc = await services.convex.saveAgentDoc({
      userId: body.userId,
      projectId,
      content: body.content,
      enabled: body.enabled
    });

    return c.json({ agentDoc });
  });
}
