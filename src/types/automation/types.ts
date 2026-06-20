export type AutomationCurve = "easeIn" | "easeInOut" | "easeOut" | "linear" | "smoothstep";

export type AutomationValueAtTime = (
  timeSec: number,
  progress: number
) => number;

export type AutomationValueAtBeat = (
  beat: number,
  progress: number
) => number;

export type TimeFunctionAutomation = {
  kind: "time-function";
  startSec: number;
  durationSec: number;
  sampleCount?: number;
  curve?: AutomationCurve;
  valueAt: AutomationValueAtTime;
};

export type BeatFunctionAutomation = {
  kind: "beat-function";
  startBeat: number;
  durationBeats: number;
  bpm?: number;
  sampleCount?: number;
  curve?: AutomationCurve;
  valueAt: AutomationValueAtBeat;
};

export type CurveAutomation = {
  kind: "curve";
  values: readonly number[];
  startSec?: number;
  durationSec?: number;
  startBeat?: number;
  durationBeats?: number;
  bpm?: number;
};

export type NumberAutomation =
  | BeatFunctionAutomation
  | CurveAutomation
  | TimeFunctionAutomation;

export type AutomatableNumber = NumberAutomation | number;
