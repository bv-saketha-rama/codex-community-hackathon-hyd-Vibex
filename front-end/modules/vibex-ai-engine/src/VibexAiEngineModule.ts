import { NativeModule, requireNativeModule } from 'expo';

import type { VibexAiEngineModuleEvents, VibexAiEngineStatus } from './VibexAiEngine.types';

declare class VibexAiEngineModule extends NativeModule<VibexAiEngineModuleEvents> {
  getStatusAsync(): Promise<VibexAiEngineStatus | null>;
  prepareModelAsync(localUri: string, modelId: string, version: string): Promise<VibexAiEngineStatus>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<VibexAiEngineModule>('VibexAiEngine');
