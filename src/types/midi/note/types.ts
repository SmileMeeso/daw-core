import type { MusicalPosition } from "../../timeline";

export type MidiNote = {
  id: string;
  pitch: number; // 0-127
  position: MusicalPosition;
  durationInBeats: number;
  velocity: number; // 1-127
  muted?: boolean;
};
