import type { Beat, MusicalPosition, SubBeat, TimeSignature } from "../types";
import { beatsToMusicalPosition, musicalPositionToBeats } from "./converters";

export function snapBeatToGrid(beat: Beat, grid: SubBeat): Beat {
  if (grid <= 0) {
    return beat;
  }

  return Math.round(beat / grid) * grid;
}

export function snapMusicalPositionToGrid(
  position: MusicalPosition,
  grid: SubBeat,
  timeSignature: TimeSignature = [4, 4]
): MusicalPosition {
  return beatsToMusicalPosition(
    snapBeatToGrid(musicalPositionToBeats(position, timeSignature), grid),
    timeSignature
  );
}
