import { registerWebModule, NativeModule } from "expo";

import type { VibexAiEngineModuleEvents, VibexAiEngineStatus } from "./VibexAiEngine.types";

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
}

export default registerWebModule(VibexAiEngineModule, "VibexAiEngine");
