export type SampleRate = number;

export type BeatsPerMinute = number;

export type TimeSignature = readonly [beatsPerBar: number, beatUnit: number];

export interface AudioTimelinePosition {
  seconds: number;
  samples: number;
  beats: number;
}

export interface TransportState {
  bpm: BeatsPerMinute;
  sampleRate: SampleRate;
  timeSignature: TimeSignature;
  position: AudioTimelinePosition;
  isPlaying: boolean;
}
