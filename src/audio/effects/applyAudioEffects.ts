import type {
  ApplyAudioEffectsOptions,
  ApplyAudioEffectsResult,
  AudioEffect
} from "../../types/audio/effects";
import { createChorusNode } from "./createChorusNode";
import { createCompressorNode } from "./createCompressorNode";
import { createDelayNode } from "./createDelayNode";
import { createFilterNode } from "./createFilterNode";

type AudioEffectGraph = {
  input: AudioNode;
  output: AudioNode;
  nodes: readonly AudioNode[];
};

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
  const graphs = effects.map((effect) => createAudioEffectGraph(effect, options));
  const nodes = graphs.flatMap((graph) => [...graph.nodes]);

  let previous: AudioNode = source;

  for (const graph of graphs) {
    previous.connect(graph.input);
    previous = graph.output;
  }

  return {
    input: source,
    nodes,
    output: previous
  };
}

function createAudioEffectGraph(
  effect: AudioEffect,
  options: Pick<ApplyAudioEffectsOptions, "audioContext" | "bpm" | "startTime">
): AudioEffectGraph {
  if (effect.type === "filter") {
    const node = createFilterNode({
      ...options,
      effect
    });

    return {
      input: node,
      nodes: [node],
      output: node
    };
  }

  if (effect.type === "compressor") {
    const node = createCompressorNode({
      ...options,
      effect
    });

    return {
      input: node,
      nodes: [node],
      output: node
    };
  }

  if (effect.type === "delay") {
    return createDelayNode({
      ...options,
      effect
    });
  }

  return createChorusNode({
    ...options,
    effect
  });
}
