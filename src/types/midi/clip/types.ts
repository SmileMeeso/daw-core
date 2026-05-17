import type { MusicalPosition } from "../../timeline";
import type { MidiEffect } from "../effects";
import type { MidiNote } from "../note";

export type MidiClip = {
  id: string;
  type: "midi-clip";
  position: MusicalPosition;

  notes: MidiNote[];

  muted?: boolean;
  midiEffects?: MidiEffect[]; // clip effects
};
