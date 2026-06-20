import type { FilterAudioEffect } from "./types";

export interface CreateFilterNodeOptions {
  audioContext: BaseAudioContext;
  effect: FilterAudioEffect;
  bpm?: number;
  startTime?: number;
}

export type CreateFilterNode = (
  options: CreateFilterNodeOptions
) => BiquadFilterNode;
