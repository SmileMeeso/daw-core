import type { MusicalPosition } from "../../timeline";
import type { AudioEffect } from "../effects";

export type AudioClip = {
  id: string;
  type: "audio-clip";
  sourceId: string;
  position: MusicalPosition;
  sourceStartSec: number;
  sourceDurationSec: number;
  gain?: number;
  pan?: number;
  playbackRate?: number;
  fadeInSec?: number;
  fadeOutSec?: number;
  muted?: boolean;
  audioEffects?: AudioEffect[]; // clip effects
};
