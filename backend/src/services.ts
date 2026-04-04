import type { Env } from "@/env";
import { createConvexService } from "@/lib/convex";
import { createDeployService } from "@/lib/deploy";
import { createGitHubService } from "@/lib/github";
import { createMarketplaceService } from "@/lib/marketplace";
import { createScreenshotService } from "@/lib/screenshot";
import { createSkillService } from "@/lib/skills";

export type Services = ReturnType<typeof createServices>;

export function createServices(env: Env) {
  const github = createGitHubService(env);
  const convex = createConvexService(env);

  return {
    convex,
    deploy: createDeployService({ env, convex, github }),
    github,
    marketplace: createMarketplaceService(env),
    screenshot: createScreenshotService(),
    skills: createSkillService({ convex })
  };
}
