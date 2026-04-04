import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import type { Env } from "@/env";
import { loadEnv } from "@/env";
import { HttpError, toErrorMessage } from "@/lib/errors";
import { registerConfirmRoutes } from "@/routes/confirm";
import { registerConversationRoutes } from "@/routes/conversation";
import { registerMcpRoutes } from "@/routes/mcps";
import { registerProjectRoutes } from "@/routes/projects";
import { registerRepoRoutes } from "@/routes/repos";
import { registerScreenshotRoutes } from "@/routes/screenshot";
import { registerSkillRoutes } from "@/routes/skills";
import { createServices } from "@/services";

export function createApp(env: Env = loadEnv(), services = createServices(env)) {
  const app = new Hono();

  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
    })
  );

  app.get("/health", (c) => c.json({ ok: true }));

  registerRepoRoutes(app, services);
  registerProjectRoutes(app, services);
  registerScreenshotRoutes(app, services);
  registerConversationRoutes(app, services);
  registerConfirmRoutes(app, services);
  registerSkillRoutes(app, services);
  registerMcpRoutes(app, services);

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      c.status(error.status as 200);
      return c.json(
        {
          error: error.message,
          details: error.details
        }
      );
    }

    c.status(500);
    return c.json(
      {
        error: toErrorMessage(error)
      }
    );
  });

  return app;
}
