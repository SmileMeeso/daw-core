import type { DAW } from "../daw";
import type { DAWOperator, EffectInput, TrackItemInput } from "../../types/daw";
import type { AudioParamInput } from "./effect";
import { getInternals } from "./internals";
import { toAudioParamValue } from "./effect";

export function add(clip: TrackItemInput = {}): DAWOperator<DAW> {
  return (daw) => getInternals(daw).addClip(clip);
}

export function effect(effect: EffectInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).addEffect(effect);
}

export function fadeIn(fadeInSec: AudioParamInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setClip({ fadeInSec: toAudioParamValue(fadeInSec) });
}

export function fadeOut(fadeOutSec: AudioParamInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setClip({ fadeOutSec: toAudioParamValue(fadeOutSec) });
}

export function gain(gain: AudioParamInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setClip({ gain: toAudioParamValue(gain) });
}

export function muted(muted: boolean): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setClip({ muted });
}

export function pan(pan: AudioParamInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setClip({ pan: toAudioParamValue(pan) });
}

export function playbackRate(playbackRate: AudioParamInput): DAWOperator<DAW> {
  return (daw) =>
    getInternals(daw).setClip({ playbackRate: toAudioParamValue(playbackRate) });
}

export function sourceRange(
  sourceStartSec: AudioParamInput,
  sourceDurationSec: AudioParamInput
): DAWOperator<DAW> {
  return (daw) =>
    getInternals(daw).setClip({
      sourceDurationSec: toAudioParamValue(sourceDurationSec),
      sourceStartSec: toAudioParamValue(sourceStartSec)
    });
}

export function update(patch: TrackItemInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setClip(patch);
}
