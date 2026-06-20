import type { AudioEffect } from "./types";

export interface ApplyAudioEffectsOptions {
  audioContext: BaseAudioContext;
  source: AudioNode;
  effects: readonly AudioEffect[];
  bpm?: number;
  startTime?: number;
}

export interface ApplyAudioEffectsResult {
  input: AudioNode;
  output: AudioNode;
  nodes: readonly AudioNode[];
}

export type ApplyAudioEffects = (
  options: ApplyAudioEffectsOptions
) => ApplyAudioEffectsResult;
