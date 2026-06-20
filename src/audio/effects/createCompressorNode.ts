import type { CreateCompressorNodeOptions } from "../../types/audio/effects";
import type { ScheduleAudioParamOptions } from "./automation";
import { scheduleAudioParamValue } from "./automation";

export function createCompressorNode({
  audioContext,
  bpm,
  effect,
  startTime
}: CreateCompressorNodeOptions): DynamicsCompressorNode {
  const node = audioContext.createDynamicsCompressor();
  const scheduleOptions = createScheduleOptions(audioContext, bpm, startTime);

  scheduleAudioParamValue(node.threshold, effect.threshold, scheduleOptions);
  scheduleAudioParamValue(node.ratio, effect.ratio, scheduleOptions);

  if (effect.attack !== undefined) {
    scheduleAudioParamValue(node.attack, effect.attack, scheduleOptions);
  }

  if (effect.release !== undefined) {
    scheduleAudioParamValue(node.release, effect.release, scheduleOptions);
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
