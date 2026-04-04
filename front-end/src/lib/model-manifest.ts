import type { DeviceModelStatus } from "@/types";

export interface DeviceModelManifest {
  modelId: string;
  version: string;
  fileName: string;
  sourceUrl: string;
  checksum?: string;
  totalBytes: number;
  supportedInputs: Array<"text" | "image" | "audio">;
}

export function getDeviceModelManifest(): DeviceModelManifest {
  return {
    modelId: process.env.EXPO_PUBLIC_GEMMA_MODEL_ID || "gemma-4-e4b-it-android",
    version: process.env.EXPO_PUBLIC_GEMMA_MODEL_VERSION || "dev-preview",
    fileName: process.env.EXPO_PUBLIC_GEMMA_MODEL_FILE || "gemma-4-e4b-it.task",
    sourceUrl: process.env.EXPO_PUBLIC_GEMMA_MODEL_URL || "",
    checksum: process.env.EXPO_PUBLIC_GEMMA_MODEL_CHECKSUM || undefined,
    totalBytes: Number(process.env.EXPO_PUBLIC_GEMMA_MODEL_SIZE_BYTES || 0),
    supportedInputs: ["text", "image", "audio"]
  };
}

export function createIdleModelStatus(): DeviceModelStatus {
  const manifest = getDeviceModelManifest();

  return {
    modelId: manifest.modelId,
    version: manifest.version,
    state: "idle",
    bytesDownloaded: 0,
    totalBytes: manifest.totalBytes,
    percentage: 0
  };
}
