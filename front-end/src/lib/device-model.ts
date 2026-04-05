import * as FileSystem from "expo-file-system/legacy";

import { generateConversationLocally, generatePatchLocally } from "@/lib/local-engine";
import { createIdleModelStatus, getDeviceModelManifest } from "@/lib/model-manifest";
import type {
  ConversationMessage,
  ConversationReply,
  ConversationSpec,
  DeviceModelStatus,
  RepoPatch,
  RepoSnapshot
} from "@/types";
import VibexAiEngineModule from "../../modules/vibex-ai-engine";

const MODEL_ROOT = `${FileSystem.documentDirectory || ""}vibex-models`;
const JSON_BLOCK_PATTERN = /<json>([\s\S]*?)<\/json>/i;
let activeDownload: FileSystem.DownloadResumable | null = null;

function getModelUri() {
  const manifest = getDeviceModelManifest();
  return `${MODEL_ROOT}/${manifest.fileName}`;
}

function trimText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

function summarizeMessages(messages: ConversationMessage[]) {
  return messages
    .slice(-8)
    .map((message) => {
      const attachments = message.attachments.map((attachment) => attachment.kind).join(", ");
      return [
        `${message.role.toUpperCase()} [${message.inputType}]`,
        attachments ? `attachments: ${attachments}` : "",
        trimText(message.content, 1200)
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function selectRelevantFiles(args: {
  repoSnapshot: RepoSnapshot;
  preferredPaths?: string[];
}) {
  const preferred = (args.preferredPaths || []).filter(Boolean);
  const exactMatches = preferred.flatMap((preferredPath) =>
    args.repoSnapshot.files.filter((file) => file.path === preferredPath)
  );
  const fuzzyMatches = preferred.flatMap((preferredPath) =>
    args.repoSnapshot.files.filter(
      (file) =>
        file.path.startsWith(preferredPath) ||
        preferredPath.startsWith(file.path.replace(/\/$/, "")) ||
        file.path.includes(preferredPath)
    )
  );

  const ordered = [...exactMatches, ...fuzzyMatches, ...args.repoSnapshot.files];
  const seen = new Set<string>();
  return ordered.filter((file) => {
    if (seen.has(file.path)) {
      return false;
    }
    seen.add(file.path);
    return true;
  });
}

function serializeRepoSnapshot(args: {
  repoSnapshot: RepoSnapshot;
  preferredPaths?: string[];
  maxChars?: number;
}) {
  const maxChars = args.maxChars || 48_000;
  const parts = [
    `Repo: ${args.repoSnapshot.repo}`,
    `Branch: ${args.repoSnapshot.branch}`,
    `Head SHA: ${args.repoSnapshot.headSha}`,
    `Summary:\n${args.repoSnapshot.repoSummary || "No summary provided."}`,
    `Dependencies: ${args.repoSnapshot.dependencies.join(", ") || "none"}`
  ];
  let remaining = maxChars - parts.join("\n\n").length;

  for (const file of selectRelevantFiles(args)) {
    if (remaining <= 0) {
      break;
    }

    const section = `FILE ${file.path}\n${trimText(file.content, Math.min(12_000, remaining))}`;
    parts.push(section);
    remaining -= section.length;
  }

  return parts.join("\n\n");
}

function extractJsonPayload(text: string) {
  const tagged = text.match(JSON_BLOCK_PATTERN)?.[1];
  const raw = (tagged || text)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Model output did not contain valid JSON.");
    }
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  }
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeConversationReply(
  value: Record<string, unknown>,
  fallbackFollowUpCount: number
): ConversationReply {
  const spec = (value.spec || {}) as Record<string, unknown>;
  const readyToConfirm = Boolean(value.readyToConfirm);

  return {
    reply: String(value.reply || "The on-device model responded without a reply message."),
    readyToConfirm,
    followUpCount:
      typeof value.followUpCount === "number"
        ? Number(value.followUpCount)
        : readyToConfirm
          ? fallbackFollowUpCount
          : fallbackFollowUpCount + 1,
    spec: {
      summary: String(spec.summary || value.reply || "Local Gemma response"),
      goals: normalizeStringArray(spec.goals),
      constraints: normalizeStringArray(spec.constraints),
      acceptanceCriteria: normalizeStringArray(spec.acceptanceCriteria),
      targetPaths: normalizeStringArray(spec.targetPaths),
      designNotes: normalizeStringArray(spec.designNotes)
    }
  };
}

function normalizePatch(value: Record<string, unknown>): RepoPatch {
  const files = Array.isArray(value.files) ? value.files : [];
  return {
    commitMessage: String(value.commitMessage || "feat: apply on-device Vibex update"),
    summary: String(value.summary || "On-device Gemma patch"),
    files: files
      .map((file) => {
        const next = file as Record<string, unknown>;
        const operation: "upsert" | "delete" = next.operation === "delete" ? "delete" : "upsert";
        return {
          path: String(next.path || ""),
          content: String(next.content || ""),
          operation,
          reason: String(next.reason || "Generated locally on device")
        };
      })
      .filter((file) => file.path)
  };
}

function buildConversationPrompt(args: {
  input: string;
  messages: ConversationMessage[];
  followUpCount: number;
  repoSnapshot: RepoSnapshot;
  skillPrompt: string;
}) {
  return [
    "Return only <json>...</json> with valid JSON and no extra prose.",
    'JSON schema: {"reply":"string","readyToConfirm":true,"followUpCount":1,"spec":{"summary":"string","goals":["string"],"constraints":["string"],"acceptanceCriteria":["string"],"targetPaths":["string"],"designNotes":["string"]}}',
    `Follow-up rounds already used: ${args.followUpCount}`,
    `Current user request:\n${args.input}`,
    `Recent conversation:\n${summarizeMessages(args.messages) || "No prior messages."}`,
    `Repo context:\n${serializeRepoSnapshot({ repoSnapshot: args.repoSnapshot })}`,
    `Skill instructions:\n${args.skillPrompt || "No additional skills."}`,
    "If attached images or audio are present, use them to understand the request before replying.",
    "Ask one concise clarifying question when the request is still ambiguous. Mark readyToConfirm true only when the spec is actionable."
  ].join("\n\n");
}

function buildPatchPrompt(args: {
  spec: ConversationSpec;
  repoSnapshot: RepoSnapshot;
  skillPrompt: string;
}) {
  return [
    "Return only <json>...</json> with valid JSON and no extra prose.",
    'JSON schema: {"commitMessage":"string","summary":"string","files":[{"path":"string","content":"string","operation":"upsert","reason":"string"}]}',
    "For every upsert file, include the complete final file contents.",
    "Keep the patch minimal and scoped to the requested paths when possible.",
    `Approved spec:\n${JSON.stringify(args.spec, null, 2)}`,
    `Relevant repo context:\n${serializeRepoSnapshot({
      repoSnapshot: args.repoSnapshot,
      preferredPaths: args.spec.targetPaths,
      maxChars: 56_000
    })}`,
    `Skill instructions:\n${args.skillPrompt || "No additional skills."}`,
    "If the best change is to update an existing file, prefer that over creating a new note file.",
    "Do not output markdown fences."
  ].join("\n\n");
}

async function generateNativeText(args: {
  prompt: string;
  systemInstruction: string;
  imageBase64s?: string[];
  audioBase64s?: string[];
}) {
  if (!VibexAiEngineModule.generateTextAsync) {
    throw new Error("Native Gemma runtime is unavailable.");
  }

  const response = await VibexAiEngineModule.generateTextAsync(
    args.prompt,
    args.systemInstruction,
    args.imageBase64s || [],
    args.audioBase64s || []
  );
  return response.text;
}

async function ensureModelDirectory() {
  const info = await FileSystem.getInfoAsync(MODEL_ROOT);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_ROOT, { intermediates: true });
  }
}

async function getFileStatus(): Promise<DeviceModelStatus> {
  const manifest = getDeviceModelManifest();
  const localUri = getModelUri();
  const info = await FileSystem.getInfoAsync(localUri);

  if (!info.exists) {
    return createIdleModelStatus();
  }

  return {
    modelId: manifest.modelId,
    version: manifest.version,
    state: "ready",
    bytesDownloaded: info.size || manifest.totalBytes,
    totalBytes: manifest.totalBytes || info.size || 0,
    percentage: 100,
    localUri
  };
}

export async function getDeviceModelStatus() {
  try {
    const status = await VibexAiEngineModule.getStatusAsync?.();
    if (status?.localUri) {
      return status as DeviceModelStatus;
    }
  } catch {
    // Ignore native lookup failures and fall back to file inspection.
  }

  return getFileStatus();
}

export async function startDeviceModelDownload(args: {
  accessToken?: string;
  onProgress?: (status: DeviceModelStatus) => void;
}) {
  const manifest = getDeviceModelManifest();
  if (!manifest.sourceUrl) {
    throw new Error("EXPO_PUBLIC_GEMMA_MODEL_URL is not configured.");
  }

  await ensureModelDirectory();
  const localUri = getModelUri();

  activeDownload = FileSystem.createDownloadResumable(
    manifest.sourceUrl,
    localUri,
    args.accessToken
      ? {
          headers: {
            Authorization: `Bearer ${args.accessToken}`
          }
        }
      : undefined,
    (progress) => {
      const totalBytes = progress.totalBytesExpectedToWrite || manifest.totalBytes || 0;
      const bytesDownloaded = progress.totalBytesWritten || 0;
      args.onProgress?.({
        modelId: manifest.modelId,
        version: manifest.version,
        state: "downloading",
        bytesDownloaded,
        totalBytes,
        percentage: totalBytes ? Math.round((bytesDownloaded / totalBytes) * 100) : 0,
        localUri
      });
    }
  );

  const result = await activeDownload.downloadAsync();
  if (!result?.uri) {
    throw new Error("Model download did not finish successfully.");
  }

  return prepareDeviceModel();
}

export async function cancelDeviceModelDownload() {
  if (activeDownload) {
    await activeDownload.pauseAsync().catch(() => undefined);
    activeDownload = null;
  }

  return getDeviceModelStatus();
}

export async function deleteDeviceModel() {
  await VibexAiEngineModule.closeModelAsync?.().catch(() => undefined);
  const localUri = getModelUri();
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }
  return createIdleModelStatus();
}

export async function prepareDeviceModel() {
  const manifest = getDeviceModelManifest();
  const localUri = getModelUri();
  const info = await FileSystem.getInfoAsync(localUri);

  if (!info.exists) {
    return createIdleModelStatus();
  }

  try {
    await VibexAiEngineModule.prepareModelAsync?.(localUri, manifest.modelId, manifest.version);
  } catch {
    // The JS fallback keeps the app usable even before the Android runtime is fully wired.
  }

  return getFileStatus();
}

export async function generateOnDeviceConversation(args: {
  input: string;
  messages: ConversationMessage[];
  followUpCount: number;
  repoSnapshot: RepoSnapshot;
  skillPrompt: string;
  imageBase64s?: string[];
  audioBase64s?: string[];
}) {
  try {
    const responseText = await generateNativeText({
      prompt: buildConversationPrompt(args),
      systemInstruction:
        "You are Vibex, a local Android coding assistant. Infer the requested repository change from text and any attached image or audio. Return strict JSON inside <json> tags.",
      imageBase64s: args.imageBase64s,
      audioBase64s: args.audioBase64s
    });

    return normalizeConversationReply(extractJsonPayload(responseText), args.followUpCount);
  } catch {
    return generateConversationLocally({
      input: args.input,
      messages: args.messages,
      followUpCount: args.followUpCount,
      repoSnapshot: args.repoSnapshot,
      skillPrompt: args.skillPrompt
    }) as ConversationReply;
  }
}

export async function generateOnDevicePatch(args: {
  spec: ConversationSpec;
  repoSnapshot: RepoSnapshot;
  skillPrompt: string;
}) {
  try {
    const responseText = await generateNativeText({
      prompt: buildPatchPrompt(args),
      systemInstruction:
        "You are Vibex, a local Android code-editing assistant. Produce minimal repository patches as strict JSON inside <json> tags. Every upsert file must contain the full final file contents.",
      imageBase64s: [],
      audioBase64s: []
    });

    const patch = normalizePatch(extractJsonPayload(responseText));
    if (patch.files.length) {
      return patch;
    }
  } catch {
    // Fall through to the deterministic fallback.
  }

  return generatePatchLocally(args) as RepoPatch;
}
