import * as FileSystem from "expo-file-system/legacy";

import { createIdleModelStatus, getDeviceModelManifest } from "@/lib/model-manifest";
import { generateConversationLocally, generatePatchLocally, transcribeAudioLocally } from "@/lib/local-engine";
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
let activeDownload: FileSystem.DownloadResumable | null = null;

function getModelUri() {
  const manifest = getDeviceModelManifest();
  return `${MODEL_ROOT}/${manifest.fileName}`;
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
  accessToken: string;
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
    {
      headers: {
        Authorization: `Bearer ${args.accessToken}`
      }
    },
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
}) {
  return generateConversationLocally(args) as ConversationReply;
}

export async function generateOnDevicePatch(args: {
  spec: ConversationSpec;
  repoSnapshot: RepoSnapshot;
  skillPrompt: string;
}) {
  return generatePatchLocally(args) as RepoPatch;
}

export async function transcribeOnDeviceAudio(audioBase64: string) {
  return transcribeAudioLocally(audioBase64);
}
