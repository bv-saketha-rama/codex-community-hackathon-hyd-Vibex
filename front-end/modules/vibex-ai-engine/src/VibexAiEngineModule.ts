import { NativeModule, requireNativeModule } from 'expo';

import type {
  VibexAiEngineGenerateResult,
  VibexAiEngineModuleEvents,
  VibexAiEngineStatus
} from './VibexAiEngine.types';

declare class VibexAiEngineModule extends NativeModule<VibexAiEngineModuleEvents> {
  getStatusAsync(): Promise<VibexAiEngineStatus | null>;
  prepareModelAsync(localUri: string, modelId: string, version: string): Promise<VibexAiEngineStatus>;
  closeModelAsync(): Promise<VibexAiEngineStatus>;
  generateTextAsync(
    prompt: string,
    systemInstruction: string | null,
    imageBase64s: string[],
    audioBase64s: string[]
  ): Promise<VibexAiEngineGenerateResult>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<VibexAiEngineModule>('VibexAiEngine');
