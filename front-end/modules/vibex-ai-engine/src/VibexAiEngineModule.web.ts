import { registerWebModule, NativeModule } from "expo";

import type {
  VibexAiEngineGenerateResult,
  VibexAiEngineModuleEvents,
  VibexAiEngineStatus
} from "./VibexAiEngine.types";

class VibexAiEngineModule extends NativeModule<VibexAiEngineModuleEvents> {
  async getStatusAsync(): Promise<VibexAiEngineStatus | null> {
    return null;
  }

  async prepareModelAsync(
    localUri: string,
    modelId: string,
    version: string
  ): Promise<VibexAiEngineStatus> {
    return {
      modelId,
      version,
      state: "ready",
      bytesDownloaded: 0,
      totalBytes: 0,
      percentage: 100,
      localUri
    };
  }

  async closeModelAsync(): Promise<VibexAiEngineStatus> {
    return {
      modelId: "",
      version: "",
      state: "idle",
      bytesDownloaded: 0,
      totalBytes: 0,
      percentage: 0
    };
  }

  async generateTextAsync(): Promise<VibexAiEngineGenerateResult> {
    throw new Error("On-device Gemma is only available in the Android development build.");
  }
}

export default registerWebModule(VibexAiEngineModule, "VibexAiEngine");
