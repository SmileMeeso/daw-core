import type { AudioClip } from "../audio/clips";
import type { AudioEffect } from "../audio/effects";
import type { AutomatableNumber } from "../automation";
import type { MidiClip, MidiEffect, MidiNote } from "../midi";

export type TrackKind = "midi" | "audio" | "hybrid" | "bus" | "master";

export type TrackItem = MidiClip | AudioClip;

export type BlockBase = {
  id: string;
  startBeat: number;
  endBeat: number;
  loop: boolean;
  title: string;
};

export type MidiBlock = BlockBase & {
  type: "midi-block";
  notes: MidiNote[];
};

export type AudioBlockFile = {
  sourceId?: string;
  uri?: string;
  fileName?: string;
  durationSec?: number;
};

export type AudioBlock = BlockBase & {
  type: "audio-block";
  audioFile: AudioBlockFile;
  sourceStartSec: number;
  sourceEndSec: number;
};

export type Block = MidiBlock | AudioBlock;

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
  Block: Block[];
  bypassed?: boolean;
};
