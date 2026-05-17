import type { MidiNote } from "../note";
import type { MidiEffect } from "./types";

export type ApplyMidiEffects = (
  notes: readonly MidiNote[],
  effects: readonly MidiEffect[]
) => readonly MidiNote[];
