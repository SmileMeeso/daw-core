import { renderAudioAutomationCurve } from "../audio/effects/automation";
import type { AudioClip } from "../types/audio/clips";
import type { AudioEffect } from "../types/audio/effects";
import type { AutomatableNumber, CurveAutomation } from "../types/automation";
import type { DAWState } from "../types/daw";
import type { MidiClip } from "../types/midi/clip";
import type { MidiNote } from "../types/midi/note";
import type { Block, Track, TrackItem } from "../types/track";

export type BakeAutomationOptions = {
  /** Tempo used to convert beat-based automation into seconds. 기본 120. */
  bpm?: number;
  /** Sample count for function automation that does not declare its own. */
  sampleCount?: number;
};

/**
 * Bakes every function-backed automation in a project state into plain value
 * curves so the result survives `JSON.stringify`.
 * 함수 기반 오토메이션을 값 배열 곡선으로 구워 JSON 직렬화가 가능하게 만듦.
 */
export function bakeDAWState(
  state: DAWState,
  options: BakeAutomationOptions = {}
): DAWState {
  const bakeOptions: BakeAutomationOptions =
    options.bpm === undefined && state.bpm !== undefined
      ? { ...options, bpm: state.bpm }
      : options;

  return {
    ...state,
    sources: state.sources.map((source) => ({ ...source })),
    tracks: state.tracks.map((track) => bakeTrack(track, bakeOptions))
  };
}

/**
 * Bakes one automatable value. Numbers and existing curves pass through.
 * 하나의 오토메이션 값을 구움. 숫자와 기존 곡선은 그대로 통과함.
 */
export function bakeAutomatableNumber(
  value: AutomatableNumber,
  options: BakeAutomationOptions = {}
): number | CurveAutomation {
  if (typeof value === "number") {
    return value;
  }

  if (value.kind === "curve") {
    return { ...value, values: [...value.values] };
  }

  const rendered = renderAudioAutomationCurve(value, options);

  return {
    durationSec: rendered.durationSec,
    kind: "curve",
    startSec: rendered.startSec,
    values: Array.from(rendered.values, toFloat32Precision)
  };
}

/**
 * Curves are rendered through a Float32Array, so a raw round trip yields noise
 * like 0.10000000149011612. Trimming to float32's ~7 significant digits keeps
 * the value the audio engine would use while keeping the JSON short.
 * Float32 정밀도(약 7자리)로 정리해 JSON 크기를 줄임.
 */
function toFloat32Precision(value: number): number {
  return Number.isFinite(value) ? Number(value.toPrecision(7)) : 0;
}

function bakeTrack(track: Track, options: BakeAutomationOptions): Track {
  return {
    ...track,
    ...(track.audioEffects !== undefined && {
      audioEffects: track.audioEffects.map((effect) => bakeAudioEffect(effect, options))
    }),
    Block: track.Block.map((block) => bakeBlock(block, options)),
    items: track.items.map((item) => bakeTrackItem(item, options)),
    pan: bakeAutomatableNumber(track.pan, options),
    volume: bakeAutomatableNumber(track.volume, options)
  };
}

function bakeBlock(block: Block, options: BakeAutomationOptions): Block {
  if (block.type === "midi-block") {
    return {
      ...block,
      notes: block.notes.map((note) => bakeMidiNote(note, options))
    };
  }

  return { ...block, audioFile: { ...block.audioFile } };
}

function bakeTrackItem(item: TrackItem, options: BakeAutomationOptions): TrackItem {
  return item.type === "midi-clip"
    ? bakeMidiClip(item, options)
    : bakeAudioClip(item, options);
}

function bakeMidiClip(clip: MidiClip, options: BakeAutomationOptions): MidiClip {
  return {
    ...clip,
    notes: clip.notes.map((note) => bakeMidiNote(note, options)),
    position: { ...clip.position }
  };
}

function bakeAudioClip(clip: AudioClip, options: BakeAutomationOptions): AudioClip {
  return {
    ...clip,
    ...(clip.audioEffects !== undefined && {
      audioEffects: clip.audioEffects.map((effect) => bakeAudioEffect(effect, options))
    }),
    ...bakeOptional("fadeInSec", clip.fadeInSec, options),
    ...bakeOptional("fadeOutSec", clip.fadeOutSec, options),
    ...bakeOptional("gain", clip.gain, options),
    ...bakeOptional("pan", clip.pan, options),
    ...bakeOptional("playbackRate", clip.playbackRate, options),
    position: { ...clip.position },
    sourceDurationSec: bakeAutomatableNumber(clip.sourceDurationSec, options),
    sourceStartSec: bakeAutomatableNumber(clip.sourceStartSec, options)
  };
}

function bakeMidiNote(note: MidiNote, options: BakeAutomationOptions): MidiNote {
  return {
    ...note,
    durationInBeats: bakeAutomatableNumber(note.durationInBeats, options),
    pitch: bakeAutomatableNumber(note.pitch, options),
    position: { ...note.position },
    velocity: bakeAutomatableNumber(note.velocity, options)
  };
}

function bakeAudioEffect(
  effect: AudioEffect,
  options: BakeAutomationOptions
): AudioEffect {
  if (effect.type === "filter") {
    return {
      ...effect,
      ...bakeOptional("qFactor", effect.qFactor, options),
      frequency: bakeAutomatableNumber(effect.frequency, options)
    };
  }

  if (effect.type === "compressor") {
    return {
      ...effect,
      ...bakeOptional("attack", effect.attack, options),
      ...bakeOptional("release", effect.release, options),
      ratio: bakeAutomatableNumber(effect.ratio, options),
      threshold: bakeAutomatableNumber(effect.threshold, options)
    };
  }

  if (effect.type === "delay") {
    return {
      ...effect,
      delayTime: bakeAutomatableNumber(effect.delayTime, options),
      feedback: bakeAutomatableNumber(effect.feedback, options),
      mix: bakeAutomatableNumber(effect.mix, options)
    };
  }

  return {
    ...effect,
    delayTime: bakeAutomatableNumber(effect.delayTime, options),
    depth: bakeAutomatableNumber(effect.depth, options),
    mix: bakeAutomatableNumber(effect.mix, options),
    rate: bakeAutomatableNumber(effect.rate, options)
  };
}

function bakeOptional<TKey extends string>(
  key: TKey,
  value: AutomatableNumber | undefined,
  options: BakeAutomationOptions
): Partial<Record<TKey, number | CurveAutomation>> {
  return value === undefined
    ? {}
    : ({ [key]: bakeAutomatableNumber(value, options) } as Record<
        TKey,
        number | CurveAutomation
      >);
}
