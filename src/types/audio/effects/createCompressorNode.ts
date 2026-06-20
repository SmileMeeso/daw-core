import type { CompressorAudioEffect } from "./types";

export interface CreateCompressorNodeOptions {
  audioContext: BaseAudioContext;
  effect: CompressorAudioEffect;
  bpm?: number;
  startTime?: number;
}

export type CreateCompressorNode = (
  options: CreateCompressorNodeOptions
) => DynamicsCompressorNode;
