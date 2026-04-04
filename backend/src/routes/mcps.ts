import type { Hono } from "hono";
import { z } from "zod";

import type { Services } from "@/services";

const listMcpQuery = z.object({
  userId: z.string()
});

const saveMcpSchema = z.object({
  userId: z.string(),
  projectId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  serverUrl: z.string().optional(),
  command: z.string().optional(),
  instructions: z.string(),
  enabled: z.boolean().optional()
});

const updateMcpSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  serverUrl: z.string().optional(),
  command: z.string().optional(),
  instructions: z.string().optional(),
  enabled: z.boolean().optional()
});

export function registerMcpRoutes(app: Hono, services: Services) {
  app.get("/mcps", async (c) => {
    const query = listMcpQuery.parse(c.req.query());
    const mcps = await services.convex.listMcps(query.userId);
    return c.json({ mcps });
  });

  app.post("/mcps", async (c) => {
    const body = saveMcpSchema.parse(await c.req.json());
    const mcp = await services.convex.saveMcp(body);
    return c.json({ mcp });
  });

  app.patch("/mcps/:mcpId", async (c) => {
    const mcpId = c.req.param("mcpId");
    const current = (await services.convex.listMcps(c.req.query("userId") || "")).find(
      (mcp) => mcp._id === mcpId
    );
    const body = updateMcpSchema.parse(await c.req.json());

    if (!current) {
      return c.json({ error: "MCP config not found." }, 404);
    }

    const mcp = await services.convex.saveMcp({
      userId: current.userId,
      projectId: body.projectId ?? current.projectId,
      name: body.name ?? current.name,
      description: body.description ?? current.description,
      serverUrl: body.serverUrl ?? current.serverUrl,
      command: body.command ?? current.command,
      instructions: body.instructions ?? current.instructions,
      enabled: body.enabled ?? current.enabled,
      mcpId
    });

    return c.json({ mcp });
  });

  app.delete("/mcps/:mcpId", async (c) => {
    await services.convex.removeMcp(c.req.param("mcpId"));
    return c.json({ ok: true });
  });
}
