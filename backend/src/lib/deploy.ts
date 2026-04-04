import type { createConvexService } from "@/lib/convex";
import type { createGitHubService } from "@/lib/github";
import type { Env } from "@/env";

type GitHubService = ReturnType<typeof createGitHubService>;
type ConvexService = ReturnType<typeof createConvexService>;

export function createDeployService(deps: {
  env: Env;
  github: GitHubService;
  convex: ConvexService;
}) {
  async function monitorDeployment(args: {
    jobId: string;
    token: string;
    repo: string;
    ref: string;
  }) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const state = await deps.github.getDeployState(args.token, args.repo, args.ref);
      await deps.convex.updateJob({
        jobId: args.jobId,
        status: state.status,
        message: state.message,
        deployUrl: state.deployUrl || undefined,
        errorCode: state.errorCode
      });

      if (state.status === "live" || state.status === "failed") {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 6_000));
    }

    await deps.convex.updateJob({
      jobId: args.jobId,
      status: "failed",
      message: "Timed out while waiting for Vercel deployment checks.",
      errorCode: "deploy_timeout"
    });
  }

  return { monitorDeployment };
}
