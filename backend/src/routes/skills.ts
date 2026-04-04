import type { Hono } from "hono";
import { z } from "zod";

import type { Services } from "@/services";

const listSkillQuery = z.object({
  userId: z.string()
});

const saveSkillSchema = z.object({
  userId: z.string(),
  projectId: z.string().optional(),
  scope: z.enum(["user", "project"]),
  name: z.string(),
  content: z.string(),
  source: z.enum(["default", "marketplace", "custom", "stitch"]),
  enabled: z.boolean().optional()
});

const updateSkillSchema = z.object({
  projectId: z.string().optional(),
  scope: z.enum(["user", "project"]).optional(),
  name: z.string().optional(),
  content: z.string().optional(),
  source: z.enum(["default", "marketplace", "custom", "stitch"]).optional(),
  enabled: z.boolean().optional()
});

export function registerSkillRoutes(app: Hono, services: Services) {
  app.get("/skills/marketplace", async (c) => {
    const skills = await services.marketplace.list();
    return c.json({ skills });
  });

  app.get("/skills", async (c) => {
    const query = listSkillQuery.parse(c.req.query());
    const skills = await services.convex.listSkills(query.userId);
    return c.json({ skills });
  });

  app.post("/skills", async (c) => {
    const body = saveSkillSchema.parse(await c.req.json());
    const skill = await services.convex.saveSkill(body);
    return c.json({ skill });
  });

  app.patch("/skills/:skillId", async (c) => {
    const skillId = c.req.param("skillId");
    const current = (await services.convex.listSkills(c.req.query("userId") || "")).find(
      (skill) => skill._id === skillId
    );
    const body = updateSkillSchema.parse(await c.req.json());

    if (!current) {
      return c.json({ error: "Skill not found." }, 404);
    }

    const skill = await services.convex.saveSkill({
      userId: current.userId,
      projectId: body.projectId ?? current.projectId,
      scope: body.scope ?? current.scope,
      name: body.name ?? current.name,
      content: body.content ?? current.content,
      source: body.source ?? current.source,
      enabled: body.enabled ?? current.enabled,
      skillId
    });

    return c.json({ skill });
  });

  app.delete("/skills/:skillId", async (c) => {
    await services.convex.removeSkill(c.req.param("skillId"));
    return c.json({ ok: true });
  });
}
