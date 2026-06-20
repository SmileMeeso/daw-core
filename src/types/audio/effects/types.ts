import type {
  AutomatableNumber,
  AutomationCurve,
  AutomationValueAtBeat,
  AutomationValueAtTime,
  BeatFunctionAutomation,
  CurveAutomation,
  NumberAutomation,
  TimeFunctionAutomation
} from "../../automation";

export type AudioAutomationCurve = AutomationCurve;
export type AudioAutomationValueAtTime = AutomationValueAtTime;
export type AudioAutomationValueAtBeat = AutomationValueAtBeat;
export type AudioTimeFunctionAutomation = TimeFunctionAutomation;
export type AudioBeatFunctionAutomation = BeatFunctionAutomation;
export type AudioCurveAutomation = CurveAutomation;
export type AudioParamAutomation = NumberAutomation;
export type AudioParamValue = AutomatableNumber;

export interface FilterAudioEffect {
  type: "filter";
  filterType: "lowpass" | "highpass";
  frequency: AudioParamValue;
  qFactor?: AudioParamValue;
}

export interface CompressorAudioEffect {
  type: "compressor";
  threshold: AudioParamValue;
  ratio: AudioParamValue;
  attack?: AudioParamValue;
  release?: AudioParamValue;
}

export type AudioEffect = FilterAudioEffect | CompressorAudioEffect;
