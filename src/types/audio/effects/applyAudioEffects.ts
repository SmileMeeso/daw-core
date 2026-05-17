import type { AudioEffect } from "./types";

export interface ApplyAudioEffectsOptions {
  audioContext: BaseAudioContext;
  source: AudioNode;
  effects: readonly AudioEffect[];
}

export interface ApplyAudioEffectsResult {
  input: AudioNode;
  output: AudioNode;
  nodes: readonly AudioNode[];
}

export type ApplyAudioEffects = (
  options: ApplyAudioEffectsOptions
) => ApplyAudioEffectsResult;
