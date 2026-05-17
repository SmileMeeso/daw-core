export type Bar = number;

export type Beat = number;

export type SubBeat = number;

export type BeatsPerMinute = number;

export type DurationBeats = number;

export type Pitch = number;

export type SampleRate = number;

export type Velocity = number;

export type TimeSignature = readonly [beatsPerBar: number, beatUnit: number];

export type MusicalPosition = {
  bar: Bar;
  beat: Beat;
  subBeat: SubBeat;
};

export type AudioTimelinePosition = {
  seconds: number;
  samples: number;
  beats: number;
};

export type TransportState = {
  bpm: BeatsPerMinute;
  sampleRate: SampleRate;
  timeSignature: TimeSignature;
  position: AudioTimelinePosition;
  isPlaying: boolean;
};

export type pitch = Pitch;

export type velocity = Velocity;

export type durationBeats = DurationBeats;
