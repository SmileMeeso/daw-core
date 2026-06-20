import type { CreateFilterNodeOptions } from "../../types/audio/effects";
import type { ScheduleAudioParamOptions } from "./automation";
import { scheduleAudioParamValue } from "./automation";

export function createFilterNode({
  audioContext,
  bpm,
  effect,
  startTime
}: CreateFilterNodeOptions): BiquadFilterNode {
  const node = audioContext.createBiquadFilter();
  const scheduleOptions = createScheduleOptions(audioContext, bpm, startTime);
  node.type = effect.filterType;

  scheduleAudioParamValue(node.frequency, effect.frequency, scheduleOptions);

  if (effect.qFactor !== undefined) {
    scheduleAudioParamValue(node.Q, effect.qFactor, scheduleOptions);
  }

  return node;
}

function createScheduleOptions(
  audioContext: BaseAudioContext,
  bpm: number | undefined,
  startTime: number | undefined
): ScheduleAudioParamOptions {
  return {
    audioContext,
    ...(bpm === undefined ? {} : { bpm }),
    ...(startTime === undefined ? {} : { startTime })
  };
}
