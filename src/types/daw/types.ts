import type { AudioClip } from "../audio/clips";
import type { AudioEffect } from "../audio/effects";
import type { AudioSource } from "../audio/sources";
import type { MidiClip } from "../midi/clip";
import type { MidiEffect } from "../midi/effects";
import type { MidiNote } from "../midi/note";
import type { PlayDAWStateOptions } from "../audio";
import type { MusicalPosition, TimeSignature } from "../timeline";
import type { AudioBlock, Block, MidiBlock, Track, TrackKind, TrackItem } from "../track";

export type MidiNoteInput = Partial<MidiNote>;

export type MidiClipInput = Partial<Omit<MidiClip, "notes">> & {
  MidiNote?: readonly MidiNoteInput[];
  midiNotes?: readonly MidiNoteInput[];
  notes?: readonly MidiNoteInput[];
};

export type AudioClipInput = Partial<AudioClip>;

export type TrackItemInput = AudioClipInput | MidiClipInput;

export type AudioSourceInput = Partial<AudioSource>;

export type MidiBlockInput = Partial<Omit<MidiBlock, "notes">> & {
  notes?: readonly MidiNoteInput[];
};

export type AudioBlockInput = Partial<AudioBlock>;

export type BlockInput = AudioBlockInput | MidiBlockInput;

export type TrackInput = Partial<Omit<Track, "items" | "Block">> & {
  Block?: readonly BlockInput[];
  items?: readonly TrackItemInput[];
};

export type EffectInput = AudioEffect | MidiEffect | number;

export type DAWOperator<TDAW> = (daw: TDAW) => void;

export type DAWOptions = {
  bpm?: number;
  durationSec?: number;
  id?: string;
  /**
   * Defaults applied to every `play()` call. Holds what a serializable state
   * cannot, such as decoded buffers and the audio context.
   * play()에 매번 적용될 기본값. 직렬화 불가능한 버퍼/컨텍스트를 담음.
   */
  playback?: PlayDAWStateOptions;
  timeSignature?: TimeSignature;
  source?: AudioSourceInput | readonly AudioSourceInput[];
  sources?: readonly AudioSourceInput[];
  track?: TrackInput | readonly TrackInput[];
  tracks?: readonly TrackInput[];
};

export type DAWState = {
  /** Project tempo. Playback falls back to 120 when absent. 프로젝트 템포. */
  bpm?: number;
  /** Project length; defaults to the length of the content. 프로젝트 길이. */
  durationSec?: number;
  id: string;
  sources: AudioSource[];
  timeSignature?: TimeSignature;
  tracks: Track[];
};

export type DAWUpdateInput =
  | AudioClipInput
  | AudioSourceInput
  | MidiClipInput
  | MidiNoteInput
  | TrackInput
  | Partial<TrackItem>
  | Partial<MusicalPosition>;

export type {
  AudioClip,
  AudioEffect,
  AudioSource,
  Block,
  MidiClip,
  MidiEffect,
  MidiNote,
  Track,
  TrackKind,
  TrackItem
};
