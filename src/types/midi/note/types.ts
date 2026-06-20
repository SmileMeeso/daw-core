import type { AutomatableNumber } from "../../automation";
import type { MusicalPosition } from "../../timeline";

export type MidiNote = {
  id: string;
  pitch: AutomatableNumber; // 0-127
  position: MusicalPosition;
  durationInBeats: AutomatableNumber;
  velocity: AutomatableNumber; // 1-127
  muted?: boolean;
};
