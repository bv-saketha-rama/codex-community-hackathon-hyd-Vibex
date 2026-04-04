import type { Hono } from "hono";
import { z } from "zod";

import type { Services } from "@/services";
import { HttpError, toErrorMessage } from "@/lib/errors";

const specSchema = z.object({
  summary: z.string(),
  goals: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  targetPaths: z.array(z.string()).default([]),
  designNotes: z.array(z.string()).default([])
});

const confirmSchema = z.object({
  userId: z.string(),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  jobId: z.string().optional(),
  spec: specSchema,
  repo: z.string(),
  branch: z.string(),
  token: z.string(),
  openai_api_key: z.string().optional(),
  image_base64: z.string().optional()
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
      status: "generating",
      phase: "generate",
      message: "Preparing repo context for code generation."
    });

    try {
      const repoSnapshot = await services.github.fetchRepoSnapshot(body.token, body.repo, body.branch);
      const skillBundle = await services.skills.composeSkillBundle({
        userId: body.userId,
        projectId: body.projectId,
        repoSnapshot,
        messages: []
      });

      const patch = await services.openai.generatePatch({
        spec: body.spec,
        repoSnapshot,
        skillPrompt: skillBundle.prompt,
        imageBase64: body.image_base64,
        openaiApiKey: body.openai_api_key
      });

      if (!patch.files.length) {
        throw new HttpError(422, "Code generation returned no file changes.");
      }

      await services.convex.updateJob({
        jobId,
        status: "pushing",
        phase: "push",
        message: "Committing the generated changes to GitHub."
      });

      const commit = await services.github.commitPatch(body.token, body.repo, body.branch, patch);

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
