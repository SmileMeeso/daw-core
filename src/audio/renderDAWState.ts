import { calculateDAWStateDurationSec, playDAWState } from "./playDAWState";
import type { DAWState } from "../types/daw";
import type { PlayDAWStateOptions } from "../types/audio";

const DEFAULT_BPM = 120;
const DEFAULT_CHANNEL_COUNT = 2;
const DEFAULT_SAMPLE_RATE = 44_100;
/** Trailing room so effect tails (delay, release) are not clipped off. */
const DEFAULT_TAIL_SEC = 0.5;

export type RenderDAWStateOptions = Omit<
  PlayDAWStateOptions,
  "audioContext" | "destination" | "startTime"
> & {
  channelCount?: number;
  sampleRate?: number;
  tailSec?: number;
};

/**
 * Renders a project offline into an AudioBuffer, faster than realtime.
 * Use it to bounce a mixdown; `playDAWState` remains the realtime path.
 * 프로젝트를 오프라인으로 렌더링해 AudioBuffer로 반환함.
 */
export async function renderDAWState(
  state: DAWState,
  options: RenderDAWStateOptions = {}
): Promise<AudioBuffer> {
  const OfflineAudioContextConstructor = resolveOfflineAudioContext();

  if (OfflineAudioContextConstructor === undefined) {
    throw new Error("OfflineAudioContext is not available in this environment.");
  }

  const bpm = options.bpm ?? DEFAULT_BPM;
  const channelCount = options.channelCount ?? DEFAULT_CHANNEL_COUNT;
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const tailSec = options.tailSec ?? DEFAULT_TAIL_SEC;
  const durationSec =
    options.durationSec ?? calculateDAWStateDurationSec(state, bpm, options.timeSignature);
  const totalSec = Math.max(durationSec + tailSec, 1 / sampleRate);
  const offlineContext = new OfflineAudioContextConstructor(
    channelCount,
    Math.ceil(totalSec * sampleRate),
    sampleRate
  );

  await playDAWState(state, {
    ...options,
    audioContext: offlineContext as unknown as AudioContext,
    bpm,
    durationSec,
    startTime: 0
  });

  return offlineContext.startRendering();
}

function resolveOfflineAudioContext():
  | (new (
      channels: number,
      length: number,
      sampleRate: number
    ) => OfflineAudioContext)
  | undefined {
  const scope = globalThis as typeof globalThis & {
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  };

  return scope.OfflineAudioContext ?? scope.webkitOfflineAudioContext;
}
