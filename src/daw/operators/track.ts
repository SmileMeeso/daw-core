import type { DAW } from "../daw";
import type { DAWOperator, EffectInput, TrackInput, TrackKind } from "../../types/daw";
import type { AudioParamInput } from "./effect";
import { getInternals } from "./internals";
import { toAudioParamValue } from "./effect";

export function add(
  kindOrTrack: TrackKind | TrackInput = "audio",
  patch: TrackInput = {}
): DAWOperator<DAW> {
  return (daw) => getInternals(daw).addTrack(kindOrTrack, patch);
}

export function armed(armed: boolean): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ armed });
}

export function bypassed(bypassed: boolean): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ bypassed });
}

export function color(color: string): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ color });
}

export function effect(effect: EffectInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrackEffect(effect);
}

export function instrumentId(instrumentId: string): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ instrumentId });
}

export function muted(muted: boolean): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ muted });
}

export function name(name: string): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ name });
}

export function order(order: number): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ order });
}

export function output(destinationTrackId: string | undefined): DAWOperator<DAW> {
  return (daw) =>
    getInternals(daw).setTrack({
      output: destinationTrackId === undefined ? {} : { destinationTrackId }
    });
}

export function pan(pan: AudioParamInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ pan: toAudioParamValue(pan) });
}

export function solo(solo: boolean): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ solo });
}

export function volume(volume: AudioParamInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setTrack({ volume: toAudioParamValue(volume) });
}
