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
  ChorusAudioEffect,
  CompressorAudioEffect,
  DelayAudioEffect,
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

export type {
  CreateChorusNode,
  CreateChorusNodeOptions
} from "./effects/createChorusNode";

export type {
  CreateDelayNode,
  CreateDelayNodeOptions
} from "./effects/createDelayNode";

export type {
  AudioSourceBufferMap,
  DAWPlayback,
  LoadAudioSource,
  PlayDAWStateOptions
} from "./playDAWState";
