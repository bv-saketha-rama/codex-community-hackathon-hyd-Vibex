import type { Hono } from "hono";
import { z } from "zod";

import type { Services } from "@/services";

const repoQuery = z.object({
  token: z.string()
});

const createRepoSchema = z.object({
  token: z.string(),
  ownerLogin: z.string(),
  ownerType: z.enum(["user", "organization"]),
  repoName: z.string().min(1),
  description: z.string().optional(),
  visibility: z.enum(["private", "public"]).optional()
});

export function registerRepoRoutes(app: Hono, services: Services) {
  app.get("/repos", async (c) => {
    const query = repoQuery.parse(c.req.query());
    const [repos, owners] = await Promise.all([
      services.github.listRepos(query.token),
      services.github.listOwners(query.token)
    ]);
    return c.json({ repos, owners });
  });

  app.post("/repos", async (c) => {
    const body = createRepoSchema.parse(await c.req.json());
    const repo = await services.github.createRepo(body.token, body);
    return c.json({ repo });
  });
}
