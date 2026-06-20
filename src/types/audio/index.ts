export type { AudioSource } from "./sources/types";

export type { AudioClip } from "./clips/types";

export type {
  AudioEffect,
  AudioAutomationCurve,
  AudioAutomationValueAtBeat,
  AudioAutomationValueAtTime,
  AudioBeatFunctionAutomation,
  AudioCurveAutomation,
  AudioParamAutomation,
  AudioParamValue,
  CompressorAudioEffect,
  FilterAudioEffect,
  AudioTimeFunctionAutomation
} from "./effects/types";

export type {
  ApplyAudioEffects,
  ApplyAudioEffectsOptions,
  ApplyAudioEffectsResult
} from "./effects/applyAudioEffects";

export type {
  CreateFilterNode,
  CreateFilterNodeOptions
} from "./effects/createFilterNode";

export type {
  CreateCompressorNode,
  CreateCompressorNodeOptions
} from "./effects/createCompressorNode";
