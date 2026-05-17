import type {
  DurationBeats,
  MusicalPosition,
  Pitch,
  Velocity,
} from "../../timeline";

export type { MidiEffect } from "../effects";

export type MidiNote = {
  position: MusicalPosition;
  pitch: Pitch;
  velocity: Velocity;
  durationBeats: DurationBeats;
};
