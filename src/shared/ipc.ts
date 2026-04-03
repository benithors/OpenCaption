import type {Cue, SubtitleStyle, TranscriptionResult, VideoMetadata} from './subtitles';

export type ImportVideoResponse = {
  canceled: boolean;
  video?: VideoMetadata;
};

export type SaveApiKeyPayload = {
  apiKey: string;
};

export type SubtitleExportPayload = {
  video: VideoMetadata;
  cues: Cue[];
  style: SubtitleStyle;
};

export type SubtitleExportResponse = {
  canceled: boolean;
  outputPath?: string;
};

export type AppBridge = {
  importVideo: () => Promise<ImportVideoResponse>;
  getPreviewVideoUrl: (videoPath: string) => Promise<string>;
  getSavedApiKey: () => Promise<string>;
  saveApiKey: (payload: SaveApiKeyPayload) => Promise<void>;
  transcribeVideo: (payload: {videoPath: string; apiKey?: string}) => Promise<TranscriptionResult>;
  exportSubtitledVideo: (payload: SubtitleExportPayload) => Promise<SubtitleExportResponse>;
};
