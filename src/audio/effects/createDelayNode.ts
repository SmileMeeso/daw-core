import type { DelayAudioEffect } from "../../types/audio/effects";
import type { ScheduleAudioParamOptions } from "./automation";
import { mapAudioParamValue, scheduleAudioParamValue } from "./automation";

export function createDelayNode({
  audioContext,
  bpm,
  effect,
  startTime
}: {
  audioContext: BaseAudioContext;
  bpm?: number;
  effect: DelayAudioEffect;
  startTime?: number;
}): { input: AudioNode; output: AudioNode; nodes: readonly AudioNode[] } {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const dry = audioContext.createGain();
  const wet = audioContext.createGain();
  const delay = audioContext.createDelay(4);
  const feedback = audioContext.createGain();
  const scheduleOptions = createScheduleOptions(audioContext, bpm, startTime);
  const mix = mapAudioParamValue(effect.mix, clampUnit);

  scheduleAudioParamValue(
    delay.delayTime,
    mapAudioParamValue(effect.delayTime, clampDelayTime),
    scheduleOptions
  );
  scheduleAudioParamValue(
    feedback.gain,
    mapAudioParamValue(effect.feedback, clampFeedback),
    scheduleOptions
  );
  scheduleAudioParamValue(wet.gain, mix, scheduleOptions);
  scheduleAudioParamValue(dry.gain, mapAudioParamValue(mix, (value) => 1 - value), scheduleOptions);

  input.connect(dry);
  dry.connect(output);
  input.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  delay.connect(feedback);
  feedback.connect(delay);

  return {
    input,
    nodes: [input, dry, delay, feedback, wet, output],
    output
  };
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

function clampFeedback(value: number): number {
  return Math.min(0.95, Math.max(0, value));
}

function clampDelayTime(value: number): number {
  return Math.min(4, Math.max(0, value));
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}
