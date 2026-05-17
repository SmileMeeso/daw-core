import type { Beat, MusicalPosition, TimeSignature } from "../types";

export function musicalPositionToBeats(
  position: MusicalPosition,
  timeSignature: TimeSignature = [4, 4]
): Beat {
  const [beatsPerBar] = timeSignature;

  return (position.bar - 1) * beatsPerBar + (position.beat - 1) + position.subBeat;
}

export function beatsToMusicalPosition(
  beats: Beat,
  timeSignature: TimeSignature = [4, 4]
): MusicalPosition {
  const [beatsPerBar] = timeSignature;
  const bar = Math.floor(beats / beatsPerBar) + 1;
  const beatOffset = beats % beatsPerBar;

  return {
    bar,
    beat: Math.floor(beatOffset) + 1,
    subBeat: beatOffset % 1
  };
}
