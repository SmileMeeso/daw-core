import type { AudioClip } from "../audio/clips";
import type { AudioEffect } from "../audio/effects";
import type { AutomatableNumber } from "../automation";
import type { MidiClip, MidiEffect } from "../midi";

export type TrackKind = "midi" | "audio" | "hybrid" | "bus" | "master";

export type TrackItem = MidiClip | AudioClip;

export type Track = {
  id: string;
  name: string;
  kind: TrackKind;
  color?: string;
  order: number;
  muted: boolean;
  solo: boolean;
  armed?: boolean;
  volume: AutomatableNumber;
  pan: AutomatableNumber;
  output?: {
    destinationTrackId?: string;
  };
  instrumentId?: string;
  midiEffects?: MidiEffect[];
  audioEffects?: AudioEffect[];
  items: TrackItem[];
  bypassed?: boolean;
};
