import type { AudioSource } from "./sources/types";
import type { DAWState } from "../daw";
import type { TimeSignature } from "../timeline";

export type AudioSourceBufferMap =
  | ReadonlyMap<string, AudioBuffer>
  | Record<string, AudioBuffer | undefined>;

export type LoadAudioSource = (
  source: AudioSource,
  audioContext: AudioContext
) => AudioBuffer | Promise<AudioBuffer | undefined> | undefined;

export type PlayDAWStateOptions = {
  audioContext?: AudioContext;
  bpm?: number;
  destination?: AudioNode;
  durationSec?: number;
  loadAudioSource?: LoadAudioSource;
  oscillatorType?: OscillatorType;
  sourceBuffers?: AudioSourceBufferMap;
  startTime?: number;
  timeSignature?: TimeSignature;
};

export type DAWPlayback = {
  audioContext: AudioContext;
  durationSec: number;
  finished: Promise<void>;
  startTime: number;
  state: DAWState;
  stop: () => void;
  stopTime: number;
};
