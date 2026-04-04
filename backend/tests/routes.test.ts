import { describe, expect, it, vi } from "vitest";

import { createApp } from "@/app";
import type { Env } from "@/env";
import type { Services } from "@/services";

const env: Env = {
  APP_URL: "http://localhost:8081",
  CONVEX_DEPLOYMENT: undefined,
  CONVEX_URL: undefined,
  CONTEXT7_API_KEY: undefined,
  PORT: 8787,
  SMITHERY_REGISTRY_URL: "https://registry.smithery.ai/v1/skills",
  STITCH_PROJECT_ENDPOINT: undefined,
  VIBE_DEPLOY_COMMITTER_EMAIL: "hello@vibedeploy.app",
  VIBE_DEPLOY_COMMITTER_NAME: "VibeDeploy"
};

describe("backend route contracts", () => {
  it("returns repo context for local on-device generation", async () => {
    const services = {
      convex: {},
      deploy: {},
      github: {
        fetchRepoSnapshot: vi.fn().mockResolvedValue({
          repo: "owner/repo",
          branch: "main",
          headSha: "abc123",
          dependencies: ["expo"],
          files: [
            {
              path: "app/index.tsx",
              content: "export default function Home() { return null; }",
              size: 52
            }
          ],
          repoSummary: "Repo: owner/repo"
        })
      },
      marketplace: {},
      screenshot: {},
      skills: {
        composeSkillBundle: vi.fn().mockResolvedValue({
          prompt: "Prefer project button primitives."
        })
      }
    } as unknown as Services;

    const app = createApp(env, services);
    const response = await app.request("/repo-context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: "user_123",
        projectId: "project_123",
        repo: "owner/repo",
        branch: "main",
        token: "github_token",
        messages: [],
        skills: []
      })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      repoSnapshot: {
        repo: "owner/repo",
        branch: "main",
        headSha: "abc123",
        dependencies: ["expo"],
        files: [
          {
            path: "app/index.tsx",
            content: "export default function Home() { return null; }",
            size: 52
          }
        ],
        repoSummary: "Repo: owner/repo"
      },
      skillPrompt: "Prefer project button primitives."
    });
  });

  it("accepts a locally generated patch and starts the push flow", async () => {
    const monitorDeployment = vi.fn().mockResolvedValue(undefined);
    const createJob = vi.fn().mockResolvedValue("job_123");
    const updateJob = vi.fn().mockResolvedValue(undefined);
    const commitPatch = vi.fn().mockResolvedValue({
      commitSha: "commit_123",
      commitUrl: "https://github.com/owner/repo/commit/commit_123"
    });

    const services = {
      convex: {
        createJob,
        updateJob
      },
      deploy: {
        monitorDeployment
      },
      github: {
        commitPatch
      },
      marketplace: {},
      screenshot: {},
      skills: {}
    } as unknown as Services;

    const app = createApp(env, services);
    const response = await app.request("/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: "user_123",
        projectId: "project_123",
        conversationId: "conversation_123",
        repo: "owner/repo",
        branch: "main",
        token: "github_token",
        patch: {
          commitMessage: "feat: local update",
          summary: "Apply an on-device generated update",
          files: [
            {
              path: "README.md",
              content: "# Updated\n",
              operation: "upsert",
              reason: "Local patch test"
            }
          ]
        }
      })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jobId: "job_123",
      commitSha: "commit_123"
    });
    expect(commitPatch).toHaveBeenCalledTimes(1);
    expect(monitorDeployment).toHaveBeenCalledWith({
      jobId: "job_123",
      token: "github_token",
      repo: "owner/repo",
      ref: "commit_123"
    });
    expect(createJob).toHaveBeenCalledTimes(1);
    expect(updateJob).toHaveBeenCalled();
  });
});
