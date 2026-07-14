import type { ChorusAudioEffect } from "./types";

export interface CreateChorusNodeOptions {
  audioContext: BaseAudioContext;
  effect: ChorusAudioEffect;
  bpm?: number;
  startTime?: number;
}

export type CreateChorusNode = (options: CreateChorusNodeOptions) => {
  input: AudioNode;
  output: AudioNode;
  nodes: readonly AudioNode[];
};
