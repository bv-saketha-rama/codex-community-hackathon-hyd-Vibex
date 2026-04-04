import { describe, expect, it } from "vitest";

import { createApp } from "@/app";

describe("backend routes", () => {
  it("responds to health", async () => {
    const app = createApp({
      APP_URL: "http://localhost:8081",
      CONVEX_DEPLOYMENT: undefined,
      CONVEX_URL: undefined,
      CONTEXT7_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
      OPENAI_MODEL: "gpt-5.4",
      OPENAI_TRANSCRIPTION_MODEL: "gpt-4o-mini-transcribe",
      PORT: 8787,
      SMITHERY_REGISTRY_URL: "https://registry.smithery.ai/v1/skills",
      STITCH_PROJECT_ENDPOINT: undefined,
      VIBE_DEPLOY_COMMITTER_EMAIL: "hello@vibedeploy.app",
      VIBE_DEPLOY_COMMITTER_NAME: "VibeDeploy"
    });

    const response = await app.request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
