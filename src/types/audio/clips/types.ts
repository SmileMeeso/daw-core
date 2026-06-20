import type { AutomatableNumber } from "../../automation";
import type { MusicalPosition } from "../../timeline";
import type { AudioEffect } from "../effects";

export type AudioClip = {
  id: string;
  type: "audio-clip";
  sourceId: string;
  position: MusicalPosition;
  sourceStartSec: AutomatableNumber;
  sourceDurationSec: AutomatableNumber;
  gain?: AutomatableNumber;
  pan?: AutomatableNumber;
  playbackRate?: AutomatableNumber;
  fadeInSec?: AutomatableNumber;
  fadeOutSec?: AutomatableNumber;
  muted?: boolean;
  audioEffects?: AudioEffect[]; // clip effects
};
