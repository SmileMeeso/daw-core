import type {
  ApplyAudioEffectsOptions,
  ApplyAudioEffectsResult,
  AudioEffect
} from "../../types/audio/effects";
import { createCompressorNode } from "./createCompressorNode";
import { createFilterNode } from "./createFilterNode";

export function applyAudioEffects({
  audioContext,
  bpm,
  effects,
  source,
  startTime
}: ApplyAudioEffectsOptions): ApplyAudioEffectsResult {
  const options = {
    audioContext,
    ...(bpm === undefined ? {} : { bpm }),
    ...(startTime === undefined ? {} : { startTime })
  };
  const nodes = effects.map((effect) =>
    createAudioEffectNode(effect, options)
  );

  let previous: AudioNode = source;

  for (const node of nodes) {
    previous.connect(node);
    previous = node;
  }

  return {
    input: source,
    nodes,
    output: previous
  };
}

function createAudioEffectNode(
  effect: AudioEffect,
  options: Pick<ApplyAudioEffectsOptions, "audioContext" | "bpm" | "startTime">
): AudioNode {
  if (effect.type === "filter") {
    return createFilterNode({
      ...options,
      effect
    });
  }

  return createCompressorNode({
    ...options,
    effect
  });
}
