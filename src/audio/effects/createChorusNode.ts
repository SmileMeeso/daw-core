import type { ChorusAudioEffect } from "../../types/audio/effects";
import type { ScheduleAudioParamOptions } from "./automation";
import { mapAudioParamValue, scheduleAudioParamValue } from "./automation";

export function createChorusNode({
  audioContext,
  bpm,
  effect,
  startTime
}: {
  audioContext: BaseAudioContext;
  bpm?: number;
  effect: ChorusAudioEffect;
  startTime?: number;
}): { input: AudioNode; output: AudioNode; nodes: readonly AudioNode[] } {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const dry = audioContext.createGain();
  const wet = audioContext.createGain();
  const delay = audioContext.createDelay(0.1);
  const lfo = audioContext.createOscillator();
  const depth = audioContext.createGain();
  const scheduleOptions = createScheduleOptions(audioContext, bpm, startTime);
  const mix = mapAudioParamValue(effect.mix, clampUnit);

  lfo.type = "sine";

  scheduleAudioParamValue(
    delay.delayTime,
    mapAudioParamValue(effect.delayTime, clampDelayTime),
    scheduleOptions
  );
  scheduleAudioParamValue(depth.gain, mapAudioParamValue(effect.depth, clampDepth), scheduleOptions);
  scheduleAudioParamValue(lfo.frequency, mapAudioParamValue(effect.rate, clampRate), scheduleOptions);
  scheduleAudioParamValue(wet.gain, mix, scheduleOptions);
  scheduleAudioParamValue(dry.gain, mapAudioParamValue(mix, (value) => 1 - value), scheduleOptions);

  input.connect(dry);
  dry.connect(output);
  input.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  lfo.connect(depth);
  depth.connect(delay.delayTime);
  lfo.start(Math.max(audioContext.currentTime, startTime ?? audioContext.currentTime));

  return {
    input,
    nodes: [input, dry, delay, lfo, depth, wet, output],
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

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampDelayTime(value: number): number {
  return Math.min(0.1, Math.max(0, value));
}

function clampDepth(value: number): number {
  return Math.min(0.05, Math.max(0, value));
}

function clampRate(value: number): number {
  return Math.min(20, Math.max(0.01, value));
}
