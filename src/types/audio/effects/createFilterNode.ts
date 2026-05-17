import type { FilterAudioEffect } from "./types";

export interface CreateFilterNodeOptions {
  audioContext: BaseAudioContext;
  effect: FilterAudioEffect;
}

export type CreateFilterNode = (
  options: CreateFilterNodeOptions
) => BiquadFilterNode;
