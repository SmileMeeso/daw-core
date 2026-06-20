import type { DAW } from "../daw";
import type { DAWOperator, MidiNoteInput } from "../../types/daw";
import type { AudioParamInput } from "./effect";
import { getInternals } from "./internals";
import { toAudioParamValue } from "./effect";

export function add(note: MidiNoteInput = {}): DAWOperator<DAW> {
  return (daw) => getInternals(daw).addNote(note);
}

export function durationInBeats(durationInBeats: AudioParamInput): DAWOperator<DAW> {
  return (daw) =>
    getInternals(daw).setNote({ durationInBeats: toAudioParamValue(durationInBeats) });
}

export function muted(muted: boolean): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setNote({ muted });
}

export function pitch(pitch: AudioParamInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setNote({ pitch: toAudioParamValue(pitch) });
}

export function update(patch: MidiNoteInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setNote(patch);
}

export function velocity(velocity: AudioParamInput): DAWOperator<DAW> {
  return (daw) => getInternals(daw).setNote({ velocity: toAudioParamValue(velocity) });
}
