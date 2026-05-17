import type { MidiNote } from "../clip/types";
import type { MidiEffect } from "./types";

export type ApplyMidiEffects = (
  notes: readonly MidiNote[],
  effects: readonly MidiEffect[],
) => readonly MidiNote[];
