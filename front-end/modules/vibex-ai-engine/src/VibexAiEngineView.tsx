import { requireNativeView } from 'expo';
import * as React from 'react';

import type { VibexAiEngineViewProps } from './VibexAiEngine.types';

const NativeView: React.ComponentType<VibexAiEngineViewProps> =
  requireNativeView('VibexAiEngine');

export default function VibexAiEngineView(props: VibexAiEngineViewProps) {
  return <NativeView {...props} />;
}
