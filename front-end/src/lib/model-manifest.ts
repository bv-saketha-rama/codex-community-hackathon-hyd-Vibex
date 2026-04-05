import type { DeviceModelStatus } from "@/types";

export interface DeviceModelManifest {
  modelId: string;
  version: string;
  fileName: string;
  sourceUrl: string;
  checksum?: string;
  totalBytes: number;
  requiresAuth: boolean;
  supportedInputs: Array<"text" | "image" | "audio">;
}

export function getDeviceModelManifest(): DeviceModelManifest {
  return {
    modelId: process.env.EXPO_PUBLIC_GEMMA_MODEL_ID || "gemma-4-e4b-it-litertlm",
    version: process.env.EXPO_PUBLIC_GEMMA_MODEL_VERSION || "litert-community",
    fileName: process.env.EXPO_PUBLIC_GEMMA_MODEL_FILE || "gemma-4-E4B-it.litertlm",
    sourceUrl:
      process.env.EXPO_PUBLIC_GEMMA_MODEL_URL ||
      "https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it.litertlm",
    checksum:
      process.env.EXPO_PUBLIC_GEMMA_MODEL_CHECKSUM ||
      "f335f2bfd1b758dc6476db16c0f41854bd6237e2658d604cbe566bcefd00a7bc",
    totalBytes: Number(process.env.EXPO_PUBLIC_GEMMA_MODEL_SIZE_BYTES || 3654467584),
    requiresAuth:
      (process.env.EXPO_PUBLIC_GEMMA_MODEL_REQUIRES_AUTH || "false").toLowerCase() === "true",
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
