import type { ConversationReply, ConversationSpec, RepoPatch, RepoSnapshot } from "@/contracts";
import type { Env } from "@/env";
import { createEmptySpec, parseJson } from "@/lib/utils";

const DEFAULT_OPENAI_MODEL = "gpt-5.4";
const DEFAULT_OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

function createFallbackConversation(args: {
  input: string;
  repoSnapshot: RepoSnapshot;
  followUpCount: number;
}): ConversationReply {
  const lowerInput = args.input.toLowerCase();
  const confirming = /(yes|ship|deploy|go ahead|confirm)/.test(lowerInput);

  const spec: ConversationSpec = {
    summary: args.input,
    goals: [args.input],
    constraints: ["Preserve existing repo conventions", "Limit changes to relevant files only"],
    acceptanceCriteria: [
      "User request is reflected in the UI",
      "Build remains valid after the change"
    ],
    targetPaths: args.repoSnapshot.files.slice(0, 4).map((file) => file.path),
    designNotes: []
  };

  if (confirming || args.followUpCount >= 2) {
    return {
      reply: "I have enough context. I'll generate the change set for the selected repo.",
      readyToConfirm: true,
      spec,
      followUpCount: args.followUpCount
    };
  }

  return {
    reply:
      "I can take that on. Should this change stay scoped to the current section only, and should I preserve the existing brand colors and copy unless you asked to change them?",
    readyToConfirm: false,
    spec,
    followUpCount: args.followUpCount + 1
  };
}

function createFallbackPatch(spec: ConversationSpec, repoSnapshot: RepoSnapshot): RepoPatch {
  const firstFile =
    repoSnapshot.files.find((file) => file.path.endsWith(".tsx")) || repoSnapshot.files[0];
  if (!firstFile) {
    return {
      commitMessage: "chore: update project with Vibex",
      summary: spec.summary,
      files: []
    };
  }

  return {
    commitMessage: "feat: apply Vibex update",
    summary: spec.summary,
    files: [
      {
        path: firstFile.path,
        operation: "upsert",
        reason: "Fallback patch placeholder",
        content: `${firstFile.content}\n`
      }
    ]
  };
}

function normalizeImageUrl(imageBase64: string) {
  return imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`;
}

function normalizeAudioBase64(audioBase64: string) {
  return audioBase64.replace(/^data:audio\/[^;]+;base64,/, "");
}

function resolveOpenAIKey(env: Env, apiKey?: string) {
  return apiKey?.trim() || env.OPENAI_API_KEY;
}

async function runJsonPrompt<T>(
  env: Env,
  args: { model: string; prompt: string; imageBase64?: string; apiKey?: string }
) {
  const apiKey = resolveOpenAIKey(env, args.apiKey);

  if (!apiKey) {
    throw new Error("OpenAI is not configured.");
  }

  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string }
  > = [{ type: "input_text", text: args.prompt }];

  if (args.imageBase64) {
    content.push({
      type: "input_image",
      image_url: normalizeImageUrl(args.imageBase64)
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: args.model,
      input: [
        {
          role: "user",
          content
        }
      ]
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        error?: {
          message?: string;
        };
        output?: Array<{
          content?: Array<{
            text?: string;
            type?: string;
          }>;
        }>;
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI request failed with ${response.status}.`);
  }

  const text =
    payload?.output
      ?.flatMap((item) => item.content || [])
      .map((item) => item.text || "")
      .join("")
      .trim() || "";

  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }

  return parseJson<T>(text);
}

export function createOpenAIService(env: Env) {
  async function transcribeAudio(audioBase64: string, apiKeyOverride?: string) {
    const apiKey = resolveOpenAIKey(env, apiKeyOverride);

    if (!apiKey) {
      return "";
    }

    try {
      const formData = new FormData();
      formData.append("model", env.OPENAI_TRANSCRIPTION_MODEL || DEFAULT_OPENAI_TRANSCRIPTION_MODEL);
      formData.append(
        "file",
        new Blob([Buffer.from(normalizeAudioBase64(audioBase64), "base64")], {
          type: "audio/webm"
        }),
        "voice.webm"
      );

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: formData
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: {
              message?: string;
            };
            text?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error?.message || `OpenAI transcription failed with ${response.status}.`
        );
      }

      return (payload?.text || "").trim();
    } catch {
      return "";
    }
  }

  async function generateConversation(args: {
    input: string;
    messages: string;
    followUpCount: number;
    repoSnapshot: RepoSnapshot;
    skillPrompt: string;
    imageBase64?: string;
    openaiApiKey?: string;
  }): Promise<ConversationReply> {
    if (!resolveOpenAIKey(env, args.openaiApiKey)) {
      return createFallbackConversation({
        input: args.input,
        repoSnapshot: args.repoSnapshot,
        followUpCount: args.followUpCount
      });
    }

    const prompt = `
You are Vibex's clarification agent.
Return JSON with keys: reply, readyToConfirm, followUpCount, spec.
spec must include summary, goals, constraints, acceptanceCriteria, targetPaths, designNotes.
Ask at most one concise clarification question when more info is needed.
Never exceed three clarification turns.

Repo summary:
${args.repoSnapshot.repoSummary}

Skill bundle:
${args.skillPrompt}

Conversation so far:
${args.messages}

Latest user input:
${args.input}
`;

    try {
      const payload = await runJsonPrompt<ConversationReply>(env, {
        model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        prompt,
        imageBase64: args.imageBase64,
        apiKey: args.openaiApiKey
      });

      return {
        reply: payload.reply,
        readyToConfirm: Boolean(payload.readyToConfirm),
        followUpCount:
          typeof payload.followUpCount === "number" ? payload.followUpCount : args.followUpCount,
        spec: payload.spec || createEmptySpec(args.input)
      };
    } catch {
      return createFallbackConversation({
        input: args.input,
        repoSnapshot: args.repoSnapshot,
        followUpCount: args.followUpCount
      });
    }
  }

  async function generatePatch(args: {
    spec: ConversationSpec;
    repoSnapshot: RepoSnapshot;
    skillPrompt: string;
    imageBase64?: string;
    openaiApiKey?: string;
  }): Promise<RepoPatch> {
    if (!resolveOpenAIKey(env, args.openaiApiKey)) {
      return createFallbackPatch(args.spec, args.repoSnapshot);
    }

    const prompt = `
You are Vibex's code generation engine.
Return JSON with keys: commitMessage, summary, files.
files must be an array of { path, operation, reason, content }.
For every upsert, return the full new file contents.
Only update files that are required for the request.

Spec:
${JSON.stringify(args.spec, null, 2)}

Skill bundle:
${args.skillPrompt}

Repository files:
${args.repoSnapshot.files
  .map((file) => `FILE: ${file.path}\n${file.content}`)
  .join("\n\n---\n\n")}
`;

    try {
      const patch = await runJsonPrompt<RepoPatch>(env, {
        model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        prompt,
        imageBase64: args.imageBase64,
        apiKey: args.openaiApiKey
      });

      return {
        commitMessage: patch.commitMessage || "feat: apply Vibex update",
        summary: patch.summary || args.spec.summary,
        files: Array.isArray(patch.files) ? patch.files : []
      };
    } catch {
      return createFallbackPatch(args.spec, args.repoSnapshot);
    }
  }

  return {
    generateConversation,
    generatePatch,
    transcribeAudio
  };
}

