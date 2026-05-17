import type { CompressorAudioEffect } from "./types";

export interface CreateCompressorNodeOptions {
  audioContext: BaseAudioContext;
  effect: CompressorAudioEffect;
}

export type CreateCompressorNode = (
  options: CreateCompressorNodeOptions
) => DynamicsCompressorNode;
