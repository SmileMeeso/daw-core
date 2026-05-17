import type { AudioClip } from "../types/audio/clips";
import type { AudioEffect } from "../types/audio/effects";
import type { AudioSource } from "../types/audio/sources";
import type { MidiClip } from "../types/midi/clip";
import type { MidiEffect } from "../types/midi/effects";
import type { MidiNote } from "../types/midi/note";
import type { MusicalPosition } from "../types/timeline";
import type { Track, TrackKind, TrackItem } from "../types/track";

export type MidiNoteInput = Partial<MidiNote>;

export type MidiClipInput = Partial<Omit<MidiClip, "notes">> & {
  MidiNote?: readonly MidiNoteInput[];
  midiNotes?: readonly MidiNoteInput[];
  notes?: readonly MidiNoteInput[];
};

export type AudioClipInput = Partial<AudioClip>;

export type TrackItemInput = AudioClipInput | MidiClipInput;

export type AudioSourceInput = Partial<AudioSource>;

export type TrackInput = Partial<Omit<Track, "items">> & {
  items?: readonly TrackItemInput[];
};

export type EffectInput = AudioEffect | MidiEffect | number;

export type DAWOptions = {
  id?: string;
  source?: AudioSourceInput | readonly AudioSourceInput[];
  sources?: readonly AudioSourceInput[];
  track?: TrackInput | readonly TrackInput[];
  tracks?: readonly TrackInput[];
};

export type DAWState = {
  id: string;
  sources: AudioSource[];
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
  MidiClip,
  MidiEffect,
  MidiNote,
  Track,
  TrackKind,
  TrackItem
};
