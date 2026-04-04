import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = () =>
  z.preprocess(emptyStringToUndefined, z.string().optional());

const optionalUrl = () =>
  z.preprocess(emptyStringToUndefined, z.string().url().optional());

const envSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:8081"),
  CONVEX_DEPLOYMENT: optionalString(),
  CONVEX_URL: optionalUrl(),
  CONTEXT7_API_KEY: optionalString(),
  OPENAI_API_KEY: optionalString(),
  OPENAI_MODEL: z.string().default("gpt-5.4"),
  OPENAI_TRANSCRIPTION_MODEL: z.string().default("gpt-4o-mini-transcribe"),
  PORT: z.coerce.number().default(8787),
  SMITHERY_REGISTRY_URL: z
    .string()
    .url()
    .default("https://registry.smithery.ai/v1/skills"),
  STITCH_PROJECT_ENDPOINT: optionalUrl(),
  VIBE_DEPLOY_COMMITTER_EMAIL: z.string().email().default("hello@vibedeploy.app"),
  VIBE_DEPLOY_COMMITTER_NAME: z.string().default("VibeDeploy")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  return envSchema.parse(process.env);
}
