import type { StyleProp, ViewStyle } from 'react-native';

export type OnLoadEventPayload = {
  url: string;
};

export type VibexAiEngineModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
  onModelStateChanged: (params: VibexAiEngineStatus) => void;
};

export type ChangeEventPayload = {
  value: string;
};

export type VibexAiEngineStatus = {
  modelId: string;
  version: string;
  state: "idle" | "downloading" | "ready" | "failed";
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  localUri?: string;
  error?: string;
};

export type VibexAiEngineGenerateResult = {
  text: string;
};

export type VibexAiEngineViewProps = {
  url: string;
  onLoad: (event: { nativeEvent: OnLoadEventPayload }) => void;
  style?: StyleProp<ViewStyle>;
};
