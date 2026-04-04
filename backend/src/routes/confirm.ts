import type { Hono } from "hono";
import { z } from "zod";

import type { Services } from "@/services";
import { HttpError, toErrorMessage } from "@/lib/errors";

const patchSchema = z.object({
  commitMessage: z.string(),
  summary: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
      operation: z.enum(["upsert", "delete"]),
      reason: z.string()
    })
  )
});

const confirmSchema = z.object({
  userId: z.string(),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  jobId: z.string().optional(),
  repo: z.string(),
  branch: z.string(),
  token: z.string(),
  patch: patchSchema
});

export function registerConfirmRoutes(app: Hono, services: Services) {
  app.post("/confirm", async (c) => {
    const body = confirmSchema.parse(await c.req.json());
    const jobId =
      body.jobId ||
      (await services.convex.createJob({
        userId: body.userId,
        projectId: body.projectId,
        conversationId: body.conversationId,
        repo: {
          fullName: body.repo,
          repoName: body.repo.split("/")[1] || body.repo,
          ownerLogin: body.repo.split("/")[0] || "",
          ownerType: "user",
          branch: body.branch
        },
        message: "Queued by Vibex"
      }));

    await services.convex.updateJob({
      jobId,
      status: "pushing",
      phase: "push",
      message: "Committing the locally generated changes to GitHub."
    });

    try {
      if (!body.patch.files.length) {
        throw new HttpError(422, "Code generation returned no file changes.");
      }

      const commit = await services.github.commitPatch(body.token, body.repo, body.branch, body.patch);

      await services.convex.updateJob({
        jobId,
        status: "deploying",
        phase: "deploy",
        message: "Push completed. Waiting for deployment checks.",
        commitSha: commit.commitSha,
        commitUrl: commit.commitUrl
      });

      void services.deploy.monitorDeployment({
        jobId,
        token: body.token,
        repo: body.repo,
        ref: commit.commitSha
      });

      return c.json({ jobId, commitSha: commit.commitSha });
    } catch (error) {
      await services.convex.updateJob({
        jobId,
        status: "failed",
        phase: "failed",
        message: toErrorMessage(error),
        errorCode: "confirm_failed"
      });
      throw error;
    }
  });
}
