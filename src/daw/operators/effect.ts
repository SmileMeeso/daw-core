import type { DAW } from "../daw";
import type {
  AudioEffect,
  AudioAutomationCurve,
  AudioAutomationValueAtBeat,
  AudioAutomationValueAtTime,
  AudioBeatFunctionAutomation,
  AudioCurveAutomation,
  CompressorAudioEffect,
  FilterAudioEffect,
  AudioParamValue,
  AudioTimeFunctionAutomation
} from "../../types/audio/effects";
import type { DAWOperator, EffectInput } from "../../types/daw";
import { getInternals } from "./internals";

export type FilterEffectOptions = {
  qFactor?: AudioParamInput;
};

export type CompressorEffectOptions = {
  attack?: AudioParamInput;
  ratio?: AudioParamInput;
  release?: AudioParamInput;
  threshold?: AudioParamInput;
};

export type TimeFunctionOptions = {
  curve?: AudioAutomationCurve;
  durationSec: number;
  sampleCount?: number;
  startSec?: number;
};

export type BeatFunctionOptions = {
  bpm?: number;
  curve?: AudioAutomationCurve;
  durationBeats: number;
  sampleCount?: number;
  startBeat: number;
};

export type CurveAutomationOptions = {
  bpm?: number;
  durationBeats?: number;
  durationSec?: number;
  startBeat?: number;
  startSec?: number;
};

export type CurveDownFromBeatOptions = {
  bpm?: number;
  curve?: AudioAutomationCurve;
  durationBeats: number;
  sampleCount?: number;
  startBeat: number;
};

export type TimeFunctionParamInput =
  | (TimeFunctionOptions & {
      valueAt: AudioAutomationValueAtTime;
    })
  | readonly [AudioAutomationValueAtTime, TimeFunctionOptions];

export type BeatFunctionParamInput =
  | (BeatFunctionOptions & {
      valueAtBeat: AudioAutomationValueAtBeat;
    })
  | readonly [AudioAutomationValueAtBeat, BeatFunctionOptions];

export type AudioParamInput =
  | AudioParamValue
  | AudioTimeFunctionAutomation
  | TimeFunctionParamInput
  | BeatFunctionParamInput;

export function add(effect: EffectInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).addEffect(effect);
}

export function beatFunction(
  valueAt: AudioAutomationValueAtBeat,
  options: BeatFunctionOptions
): AudioBeatFunctionAutomation {
  return {
    kind: "beat-function",
    valueAt,
    ...options
  };
}

export function compressor(options: CompressorEffectOptions = {}): CompressorAudioEffect {
  const effect: CompressorAudioEffect = {
    ratio: toAudioParamValue(options.ratio ?? 4),
    threshold: toAudioParamValue(options.threshold ?? -24),
    type: "compressor"
  };

  if (options.attack !== undefined) {
    effect.attack = toAudioParamValue(options.attack);
  }

  if (options.release !== undefined) {
    effect.release = toAudioParamValue(options.release);
  }

  return effect;
}

export function eq(
  frequency: AudioParamInput,
  filterType: FilterAudioEffect["filterType"] = "lowpass",
  options: FilterEffectOptions = {}
): FilterAudioEffect {
  return filter(filterType, frequency, options);
}

export function curve(
  values: readonly number[],
  options: CurveAutomationOptions
): AudioCurveAutomation {
  return {
    kind: "curve",
    values,
    ...options
  };
}

export function curveDownFromBeat(
  from: number,
  to: number,
  options: CurveDownFromBeatOptions
): AudioBeatFunctionAutomation {
  return beatFunction(
    (_beat, progress) => from + (to - from) * progress,
    {
      curve: options.curve ?? "smoothstep",
      durationBeats: options.durationBeats,
      startBeat: options.startBeat,
      ...(options.bpm === undefined ? {} : { bpm: options.bpm }),
      ...(options.sampleCount === undefined ? {} : { sampleCount: options.sampleCount })
    }
  );
}

export function filter(
  filterType: FilterAudioEffect["filterType"],
  frequency: AudioParamInput,
  options: FilterEffectOptions = {}
): FilterAudioEffect {
  const effect: FilterAudioEffect = {
    filterType,
    frequency: toAudioParamValue(frequency),
    type: "filter"
  };

  if (options.qFactor !== undefined) {
    effect.qFactor = toAudioParamValue(options.qFactor);
  }

  return effect;
}

export function highpass(
  frequency: AudioParamInput = 80,
  options: FilterEffectOptions = {}
): FilterAudioEffect {
  return filter("highpass", frequency, options);
}

export function limiter(threshold = -1): CompressorAudioEffect {
  return compressor({
    attack: 0.003,
    ratio: 20,
    release: 0.1,
    threshold
  });
}

export function lowpass(
  frequency: AudioParamInput = 12_000,
  options: FilterEffectOptions = {}
): FilterAudioEffect {
  return filter("lowpass", frequency, options);
}

export function timeFunction(
  valueAt: AudioAutomationValueAtTime,
  options: TimeFunctionOptions
): AudioTimeFunctionAutomation {
  return {
    kind: "time-function",
    startSec: options.startSec ?? 0,
    valueAt,
    ...(options.curve === undefined ? {} : { curve: options.curve }),
    ...(options.sampleCount === undefined ? {} : { sampleCount: options.sampleCount }),
    durationSec: options.durationSec
  };
}

export function track(effect: EffectInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrackEffect(effect);
}

export function chain(...effects: readonly AudioEffect[]): readonly AudioEffect[] {
  return effects;
}

function isAudioParamValue(input: AudioParamInput): input is AudioParamValue {
  return typeof input === "number" || ("kind" in input && typeof input.kind === "string");
}

function isBeatFunctionObject(
  input: AudioParamInput
): input is BeatFunctionOptions & { valueAtBeat: AudioAutomationValueAtBeat } {
  return !Array.isArray(input) && typeof input === "object" && "valueAtBeat" in input;
}

function isTimeFunctionObject(
  input: AudioParamInput
): input is TimeFunctionOptions & { valueAt: AudioAutomationValueAtTime } {
  return !Array.isArray(input) && typeof input === "object" && "valueAt" in input;
}

export function toAudioParamValue(input: AudioParamInput): AudioParamValue {
  if (isAudioParamValue(input)) {
    return input;
  }

  if (Array.isArray(input)) {
    const [valueAt, options] = input;

    if ("startBeat" in options) {
      return beatFunction(valueAt as AudioAutomationValueAtBeat, options);
    }

    return timeFunction(valueAt as AudioAutomationValueAtTime, options);
  }

  if (isBeatFunctionObject(input)) {
    return beatFunction(input.valueAtBeat, input);
  }

  if (isTimeFunctionObject(input)) {
    return timeFunction(input.valueAt, input);
  }

  throw new TypeError("Unsupported audio parameter input.");
}
