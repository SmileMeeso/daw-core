import type { DelayAudioEffect } from "./types";

export interface CreateDelayNodeOptions {
  audioContext: BaseAudioContext;
  effect: DelayAudioEffect;
  bpm?: number;
  startTime?: number;
}

export type CreateDelayNode = (options: CreateDelayNodeOptions) => {
  input: AudioNode;
  output: AudioNode;
  nodes: readonly AudioNode[];
};
