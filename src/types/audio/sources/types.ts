export type AudioSource = {
  id: string;
  kind: "audio-source";
  uri: string;
  fileName?: string;
  sampleRate?: number;
  channelCount?: number;
  durationSec: number;
};
