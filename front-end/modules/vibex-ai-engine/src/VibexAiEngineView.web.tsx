import * as React from 'react';

import type { VibexAiEngineViewProps } from './VibexAiEngine.types';

export default function VibexAiEngineView(props: VibexAiEngineViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
