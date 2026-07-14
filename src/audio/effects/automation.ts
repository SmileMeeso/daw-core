import type {
  AudioAutomationCurve,
  AudioParamAutomation,
  AudioParamValue
} from "../../types/audio/effects";

export type RenderAudioAutomationOptions = {
  bpm?: number;
  sampleCount?: number;
};

export type RenderedAudioAutomation = {
  durationSec: number;
  startSec: number;
  values: Float32Array;
};

export type ScheduleAudioParamOptions = RenderAudioAutomationOptions & {
  audioContext: BaseAudioContext;
  startTime?: number;
};

export function isAudioParamAutomation(
  value: AudioParamValue
): value is AudioParamAutomation {
  return typeof value === "object" && value !== null && "kind" in value;
}

export function mapAudioParamValue(
  value: AudioParamValue,
  mapper: (value: number) => number
): AudioParamValue {
  if (!isAudioParamAutomation(value)) {
    return mapper(value);
  }

  if (value.kind === "curve") {
    return {
      ...value,
      values: value.values.map(mapper)
    };
  }

  if (value.kind === "time-function") {
    return {
      ...value,
      valueAt: (timeSec, progress) => mapper(value.valueAt(timeSec, progress))
    };
  }

  return {
    ...value,
    valueAt: (beat, progress) => mapper(value.valueAt(beat, progress))
  };
}

export function renderAudioAutomationCurve(
  automation: AudioParamAutomation,
  options: RenderAudioAutomationOptions = {}
): RenderedAudioAutomation {
  if (automation.kind === "curve") {
    const bpm = automation.bpm ?? options.bpm ?? 120;

    return {
      durationSec: resolveDurationSec(automation, bpm),
      startSec: resolveStartSec(automation, bpm),
      values: Float32Array.from(automation.values)
    };
  }

  if (automation.kind === "time-function") {
    const sampleCount = resolveSampleCount(automation.sampleCount, options.sampleCount);
    const values = sampleValues(sampleCount, automation.curve, (progress) => {
      const timeSec = automation.startSec + automation.durationSec * progress.raw;

      return automation.valueAt(timeSec, progress.curved);
    });

    return {
      durationSec: automation.durationSec,
      startSec: automation.startSec,
      values
    };
  }

  const bpm = automation.bpm ?? options.bpm ?? 120;
  const durationSec = beatsToSeconds(automation.durationBeats, bpm);
  const sampleCount = resolveSampleCount(automation.sampleCount, options.sampleCount);
  const values = sampleValues(sampleCount, automation.curve, (progress) => {
    const beat = automation.startBeat + automation.durationBeats * progress.raw;

    return automation.valueAt(beat, progress.curved);
  });

  return {
    durationSec,
    startSec: beatsToSeconds(automation.startBeat, bpm),
    values
  };
}

export function scheduleAudioParamValue(
  param: AudioParam,
  value: AudioParamValue,
  options: ScheduleAudioParamOptions
): void {
  const startTime = options.startTime ?? options.audioContext.currentTime;

  if (!isAudioParamAutomation(value)) {
    param.setValueAtTime(value, startTime);
    return;
  }

  const rendered = renderAudioAutomationCurve(value, options);
  const absoluteStart = startTime + rendered.startSec;
  const [firstValue] = rendered.values;

  if (firstValue === undefined) {
    return;
  }

  param.cancelScheduledValues(absoluteStart);

  if (rendered.durationSec <= 0 || rendered.values.length < 2) {
    param.setValueAtTime(firstValue, absoluteStart);
    return;
  }

  param.setValueCurveAtTime(rendered.values, absoluteStart, rendered.durationSec);
}

function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

function curveProgress(progress: number, curve: AudioAutomationCurve = "linear"): number {
  if (curve === "easeIn") {
    return progress * progress;
  }

  if (curve === "easeOut") {
    return 1 - (1 - progress) * (1 - progress);
  }

  if (curve === "easeInOut") {
    return progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  }

  if (curve === "smoothstep") {
    return progress * progress * (3 - 2 * progress);
  }

  return progress;
}

function resolveDurationSec(
  automation: Extract<AudioParamAutomation, { kind: "curve" }>,
  bpm: number
): number {
  if (automation.durationSec !== undefined) {
    return automation.durationSec;
  }

  if (automation.durationBeats !== undefined) {
    return beatsToSeconds(automation.durationBeats, bpm);
  }

  return 0;
}

function resolveSampleCount(
  automationSampleCount: number | undefined,
  fallbackSampleCount: number | undefined
): number {
  return Math.max(2, Math.floor(automationSampleCount ?? fallbackSampleCount ?? 64));
}

function resolveStartSec(
  automation: Extract<AudioParamAutomation, { kind: "curve" }>,
  bpm: number
): number {
  if (automation.startSec !== undefined) {
    return automation.startSec;
  }

  if (automation.startBeat !== undefined) {
    return beatsToSeconds(automation.startBeat, bpm);
  }

  return 0;
}

function sampleValues(
  sampleCount: number,
  curve: AudioAutomationCurve | undefined,
  valueAt: (progress: { curved: number; raw: number }) => number
): Float32Array {
  return Float32Array.from({ length: sampleCount }, (_value, index) => {
    const raw = sampleCount === 1 ? 1 : index / (sampleCount - 1);

    return valueAt({
      curved: curveProgress(raw, curve),
      raw
    });
  });
}
