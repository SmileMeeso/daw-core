import type { AudioClip } from "../types/audio/clips";
import type { AudioParamAutomation } from "../types/audio/effects";
import type { AudioSource } from "../types/audio/sources";
import type {
  AudioSourceBufferMap,
  DAWPlayback,
  LoadAudioSource,
  PlayDAWStateOptions
} from "../types/audio/playDAWState";
import type { MidiEffect, MidiNote } from "../types/midi";
import type { TimeSignature } from "../types/timeline";
import type { Track, TrackItem } from "../types/track";
import type { AutomatableNumber } from "../types/automation";
import type { DAWState } from "../types/daw";
import { musicalPositionToBeats } from "../timeline";
import { applyAudioEffects } from "./effects";
import {
  isAudioParamAutomation,
  renderAudioAutomationCurve,
  scheduleAudioParamValue
} from "./effects/automation";

type TrackGraph = {
  input: GainNode;
  output: AudioNode;
  track: Track;
};

const DEFAULT_BPM = 120;
const DEFAULT_TIME_SIGNATURE: TimeSignature = [4, 4];
const DEFAULT_MIDI_RELEASE_SEC = 0.08;
const DEFAULT_SCHEDULE_OFFSET_SEC = 0.05;
const DEFAULT_TAIL_SEC = 0.35;

export async function playDAWState(
  state: DAWState,
  options: PlayDAWStateOptions = {}
): Promise<DAWPlayback> {
  const audioContext = options.audioContext ?? createAudioContext();
  const bpm = options.bpm ?? DEFAULT_BPM;
  const destination = options.destination ?? audioContext.destination;
  const startTime =
    options.startTime ?? audioContext.currentTime + DEFAULT_SCHEDULE_OFFSET_SEC;
  const timeSignature = options.timeSignature ?? DEFAULT_TIME_SIGNATURE;
  const durationSec =
    options.durationSec ?? calculateDAWStateDurationSec(state, bpm, timeSignature);
  const stopTime = startTime + durationSec + DEFAULT_TAIL_SEC;
  const sources = new Map(state.sources.map((source) => [source.id, source]));
  const trackGraphs = createTrackGraphs({
    audioContext,
    bpm,
    destination,
    startTime,
    state
  });
  const scheduledSources: AudioScheduledSourceNode[] = [];
  const allowedTrackIds = getAllowedTrackIds(state.tracks);

  connectTrackGraphs(trackGraphs, destination);

  for (const graph of trackGraphs.values()) {
    if (!allowedTrackIds.has(graph.track.id)) {
      continue;
    }

    await scheduleTrackItems({
      audioContext,
      bpm,
      graph,
      loadAudioSource: options.loadAudioSource,
      oscillatorType: options.oscillatorType ?? "sawtooth",
      scheduledSources,
      sourceBuffers: options.sourceBuffers,
      sources,
      startTime,
      timeSignature
    });
  }

  await audioContext.resume();

  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveFinished: () => void = () => undefined;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
    finishTimer = setTimeout(resolve, Math.max(0, (stopTime - audioContext.currentTime) * 1000));
  });

  return {
    audioContext,
    durationSec,
    finished,
    startTime,
    state,
    stop: () => {
      if (finishTimer !== undefined) {
        clearTimeout(finishTimer);
        finishTimer = undefined;
      }

      for (const source of scheduledSources) {
        try {
          source.stop();
        } catch {
          // Already stopped or not yet startable; either way stop() has done its job.
        }
      }

      resolveFinished();
    },
    stopTime
  };
}

function createTrackGraphs({
  audioContext,
  bpm,
  destination,
  startTime,
  state
}: {
  audioContext: AudioContext;
  bpm: number;
  destination: AudioNode;
  startTime: number;
  state: DAWState;
}): Map<string, TrackGraph> {
  const graphs = new Map<string, TrackGraph>();

  for (const track of state.tracks) {
    const input = audioContext.createGain();
    const output = createTrackOutput({
      audioContext,
      bpm,
      destination,
      input,
      startTime,
      track
    });

    graphs.set(track.id, {
      input,
      output,
      track
    });
  }

  return graphs;
}

function createTrackOutput({
  audioContext,
  bpm,
  destination,
  input,
  startTime,
  track
}: {
  audioContext: AudioContext;
  bpm: number;
  destination: AudioNode;
  input: GainNode;
  startTime: number;
  track: Track;
}): AudioNode {
  let output: AudioNode = input;

  if (!track.bypassed && track.audioEffects !== undefined) {
    output = applyAudioEffects({
      audioContext,
      bpm,
      effects: track.audioEffects,
      source: output,
      startTime
    }).output;
  }

  if ("createStereoPanner" in audioContext) {
    const pan = audioContext.createStereoPanner();
    scheduleAudioParamValue(pan.pan, track.pan, {
      audioContext,
      bpm,
      startTime
    });
    output.connect(pan);
    output = pan;
  }

  const volume = audioContext.createGain();
  scheduleAudioParamValue(volume.gain, track.muted ? 0 : track.volume, {
    audioContext,
    bpm,
    startTime
  });
  output.connect(volume);

  return volume;
}

function connectTrackGraphs(
  trackGraphs: Map<string, TrackGraph>,
  destination: AudioNode
): void {
  const firstMaster = [...trackGraphs.values()].find(
    (graph) => graph.track.kind === "master"
  );

  for (const graph of trackGraphs.values()) {
    const destinationTrackId = graph.track.output?.destinationTrackId;
    const routedTarget =
      destinationTrackId === undefined ? undefined : trackGraphs.get(destinationTrackId);
    const target =
      routedTarget !== undefined && routedTarget.track.id !== graph.track.id
        ? routedTarget.input
        : graph.track.kind === "master" || firstMaster === undefined
          ? destination
          : firstMaster.input;

    graph.output.connect(target);
  }
}

async function scheduleTrackItems({
  audioContext,
  bpm,
  graph,
  loadAudioSource,
  oscillatorType,
  scheduledSources,
  sourceBuffers,
  sources,
  startTime,
  timeSignature
}: {
  audioContext: AudioContext;
  bpm: number;
  graph: TrackGraph;
  loadAudioSource: LoadAudioSource | undefined;
  oscillatorType: OscillatorType;
  scheduledSources: AudioScheduledSourceNode[];
  sourceBuffers: AudioSourceBufferMap | undefined;
  sources: ReadonlyMap<string, AudioSource>;
  startTime: number;
  timeSignature: TimeSignature;
}): Promise<void> {
  for (const item of graph.track.items) {
    if (item.muted) {
      continue;
    }

    if (item.type === "midi-clip") {
      scheduleMidiClip({
        audioContext,
        bpm,
        clip: item,
        oscillatorType,
        scheduledSources,
        startTime,
        timeSignature,
        track: graph.track,
        trackInput: graph.input
      });
      continue;
    }

    await scheduleAudioClip({
      audioContext,
      bpm,
      clip: item,
      loadAudioSource,
      scheduledSources,
      sourceBuffers,
      sources,
      startTime,
      timeSignature,
      trackInput: graph.input
    });
  }
}

function scheduleMidiClip({
  audioContext,
  bpm,
  clip,
  oscillatorType,
  scheduledSources,
  startTime,
  timeSignature,
  track,
  trackInput
}: {
  audioContext: AudioContext;
  bpm: number;
  clip: Extract<TrackItem, { type: "midi-clip" }>;
  oscillatorType: OscillatorType;
  scheduledSources: AudioScheduledSourceNode[];
  startTime: number;
  timeSignature: TimeSignature;
  track: Track;
  trackInput: AudioNode;
}): void {
  const clipStartSec = positionToSeconds(clip.position, bpm, timeSignature);
  const clipInput = createClipOutput({
    audioContext,
    bpm,
    clip,
    startTime,
    trackInput
  });
  const notes = applyMidiEffects(
    clip.notes,
    [...(track.midiEffects ?? []), ...(clip.midiEffects ?? [])]
  );

  for (const note of notes) {
    if (note.muted) {
      continue;
    }

    const noteStartSec =
      clipStartSec + positionToSeconds(note.position, bpm, timeSignature);
    const noteDurationSec = beatsToSeconds(
      Math.max(0, resolveNumber(note.durationInBeats, { bpm })),
      bpm
    );
    const velocity = clamp(resolveNumber(note.velocity, { bpm }, 100) / 127, 0, 1);
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const absoluteStart = startTime + noteStartSec;
    const absoluteEnd = absoluteStart + noteDurationSec;

    oscillator.type = oscillatorType;
    scheduleMidiPitch(oscillator.frequency, note.pitch, {
      audioContext,
      bpm,
      startTime: absoluteStart
    });

    envelope.gain.setValueAtTime(0, absoluteStart);
    envelope.gain.linearRampToValueAtTime(velocity * 0.24, absoluteStart + 0.015);
    envelope.gain.setValueAtTime(velocity * 0.22, Math.max(absoluteStart + 0.016, absoluteEnd - 0.03));
    envelope.gain.linearRampToValueAtTime(0, absoluteEnd + DEFAULT_MIDI_RELEASE_SEC);

    oscillator.connect(envelope);
    envelope.connect(clipInput);
    oscillator.start(absoluteStart);
    oscillator.stop(absoluteEnd + DEFAULT_MIDI_RELEASE_SEC);
    scheduledSources.push(oscillator);
  }
}

async function scheduleAudioClip({
  audioContext,
  bpm,
  clip,
  loadAudioSource,
  scheduledSources,
  sourceBuffers,
  sources,
  startTime,
  timeSignature,
  trackInput
}: {
  audioContext: AudioContext;
  bpm: number;
  clip: AudioClip;
  loadAudioSource: LoadAudioSource | undefined;
  scheduledSources: AudioScheduledSourceNode[];
  sourceBuffers: AudioSourceBufferMap | undefined;
  sources: ReadonlyMap<string, AudioSource>;
  startTime: number;
  timeSignature: TimeSignature;
  trackInput: AudioNode;
}): Promise<void> {
  const source = sources.get(clip.sourceId);
  const buffer = await resolveSourceBuffer({
    audioContext,
    loadAudioSource,
    source,
    sourceBuffers,
    sourceId: clip.sourceId
  });

  if (buffer === undefined) {
    return;
  }

  const bufferSource = audioContext.createBufferSource();
  const clipStartSec = positionToSeconds(clip.position, bpm, timeSignature);
  const sourceStartSec = Math.max(0, resolveNumber(clip.sourceStartSec, { bpm }));
  const sourceDurationSec = Math.max(
    0,
    resolveNumber(clip.sourceDurationSec, { bpm }, buffer.duration - sourceStartSec)
  );
  const absoluteStart = startTime + clipStartSec;
  const playbackRate = clip.playbackRate ?? 1;

  bufferSource.buffer = buffer;
  scheduleAudioParamValue(bufferSource.playbackRate, playbackRate, {
    audioContext,
    bpm,
    startTime: absoluteStart
  });

  bufferSource.connect(
    createClipOutput({
      audioContext,
      bpm,
      clip,
      startTime: absoluteStart,
      trackInput
    })
  );
  bufferSource.start(absoluteStart, sourceStartSec, sourceDurationSec);
  bufferSource.stop(absoluteStart + sourceDurationSec + DEFAULT_TAIL_SEC);
  scheduledSources.push(bufferSource);
}

function createClipOutput({
  audioContext,
  bpm,
  clip,
  startTime,
  trackInput
}: {
  audioContext: AudioContext;
  bpm: number;
  clip: TrackItem;
  startTime: number;
  trackInput: AudioNode;
}): AudioNode {
  const input = audioContext.createGain();
  let output: AudioNode = input;

  if (clip.type === "audio-clip" && clip.audioEffects !== undefined) {
    output = applyAudioEffects({
      audioContext,
      bpm,
      effects: clip.audioEffects,
      source: output,
      startTime
    }).output;
  }

  if (clip.type === "audio-clip" && clip.pan !== undefined && "createStereoPanner" in audioContext) {
    const pan = audioContext.createStereoPanner();
    scheduleAudioParamValue(pan.pan, clip.pan, {
      audioContext,
      bpm,
      startTime
    });
    output.connect(pan);
    output = pan;
  }

  const gain = audioContext.createGain();
  const clipGain = clip.type === "audio-clip" ? clip.gain : undefined;
  scheduleAudioParamValue(gain.gain, clipGain ?? 1, {
    audioContext,
    bpm,
    startTime
  });
  scheduleClipFades(gain.gain, clip, {
    audioContext,
    bpm,
    startTime
  });

  output.connect(gain);
  gain.connect(trackInput);

  return input;
}

function scheduleClipFades(
  gain: AudioParam,
  clip: TrackItem,
  options: { audioContext: AudioContext; bpm: number; startTime: number }
): void {
  if (clip.type !== "audio-clip" || isAudioParamAutomation(clip.gain ?? 1)) {
    return;
  }

  const baseGain = typeof clip.gain === "number" ? clip.gain : 1;
  const fadeInSec = clip.fadeInSec === undefined ? 0 : resolveNumber(clip.fadeInSec, options);
  const fadeOutSec =
    clip.fadeOutSec === undefined ? 0 : resolveNumber(clip.fadeOutSec, options);
  const durationSec = resolveNumber(clip.sourceDurationSec, options);

  if (fadeInSec > 0) {
    gain.setValueAtTime(0, options.startTime);
    gain.linearRampToValueAtTime(baseGain, options.startTime + fadeInSec);
  }

  if (fadeOutSec > 0 && durationSec > fadeOutSec) {
    gain.setValueAtTime(baseGain, options.startTime + durationSec - fadeOutSec);
    gain.linearRampToValueAtTime(0, options.startTime + durationSec);
  }
}

async function resolveSourceBuffer({
  audioContext,
  loadAudioSource,
  source,
  sourceBuffers,
  sourceId
}: {
  audioContext: AudioContext;
  loadAudioSource: LoadAudioSource | undefined;
  source: AudioSource | undefined;
  sourceBuffers: AudioSourceBufferMap | undefined;
  sourceId: string;
}): Promise<AudioBuffer | undefined> {
  const cached = getSourceBuffer(sourceBuffers, sourceId);

  if (cached !== undefined) {
    return cached;
  }

  if (source === undefined) {
    return undefined;
  }

  if (loadAudioSource !== undefined) {
    return loadAudioSource(source, audioContext);
  }

  if (source.uri === "" || typeof fetch !== "function") {
    return undefined;
  }

  const response = await fetch(source.uri);
  const data = await response.arrayBuffer();

  return audioContext.decodeAudioData(data);
}

function getSourceBuffer(
  sourceBuffers: AudioSourceBufferMap | undefined,
  sourceId: string
): AudioBuffer | undefined {
  if (sourceBuffers === undefined) {
    return undefined;
  }

  if (isSourceBufferMap(sourceBuffers)) {
    return sourceBuffers.get(sourceId);
  }

  return sourceBuffers[sourceId];
}

function isSourceBufferMap(
  sourceBuffers: AudioSourceBufferMap
): sourceBuffers is ReadonlyMap<string, AudioBuffer> {
  return typeof (sourceBuffers as ReadonlyMap<string, AudioBuffer>).get === "function";
}

function applyMidiEffects(
  notes: readonly MidiNote[],
  effects: readonly MidiEffect[]
): MidiNote[] {
  let nextNotes = [...notes];

  for (const effect of effects) {
    if (effect.type === "transpose") {
      nextNotes = nextNotes.map((note) => ({
        ...note,
        pitch: mapResolvedNumber(note.pitch, (pitch) => pitch + effect.semitones)
      }));
      continue;
    }

    if (effect.type === "quantize") {
      nextNotes = nextNotes.map((note) => ({
        ...note,
        position: beatsToMusicalPosition(
          Math.round(musicalPositionToBeats(note.position) / effect.grid) * effect.grid
        )
      }));
      continue;
    }

    if (effect.type === "velocity-compress") {
      nextNotes = nextNotes.map((note) => ({
        ...note,
        velocity: mapResolvedNumber(note.velocity, (velocity) =>
          64 + (velocity - 64) / Math.max(1, effect.amount)
        )
      }));
      continue;
    }

    nextNotes = nextNotes.filter((note) => {
      const pitch = resolveNumber(note.pitch, { bpm: DEFAULT_BPM });

      return pitch >= effect.minPitch && pitch <= effect.maxPitch;
    });
  }

  return nextNotes;
}

function scheduleMidiPitch(
  param: AudioParam,
  pitch: AutomatableNumber,
  options: { audioContext: AudioContext; bpm: number; startTime: number }
): void {
  if (typeof pitch === "number") {
    param.setValueAtTime(midiPitchToFrequency(pitch), options.startTime);
    return;
  }

  const rendered = renderAudioAutomationCurve(pitch as AudioParamAutomation, options);
  const values = Float32Array.from(rendered.values, midiPitchToFrequency);
  const firstValue = values[0];

  if (firstValue === undefined) {
    return;
  }

  const absoluteStart = options.startTime + rendered.startSec;
  param.cancelScheduledValues(absoluteStart);

  if (rendered.durationSec <= 0 || values.length < 2) {
    param.setValueAtTime(firstValue, absoluteStart);
    return;
  }

  param.setValueCurveAtTime(values, absoluteStart, rendered.durationSec);
}

function mapResolvedNumber(
  value: AutomatableNumber,
  transform: (value: number) => number
): AutomatableNumber {
  if (typeof value === "number") {
    return transform(value);
  }

  if (value.kind === "curve") {
    return {
      ...value,
      values: value.values.map(transform)
    };
  }

  if (value.kind === "time-function") {
    return {
      ...value,
      valueAt: (timeSec, progress) => transform(value.valueAt(timeSec, progress))
    };
  }

  return {
    ...value,
    valueAt: (beat, progress) => transform(value.valueAt(beat, progress))
  };
}

function resolveNumber(
  value: AutomatableNumber,
  options: { bpm: number },
  fallback = 0
): number {
  if (typeof value === "number") {
    return value;
  }

  const [firstValue] = renderAudioAutomationCurve(value as AudioParamAutomation, options).values;

  return firstValue ?? fallback;
}

function calculateDAWStateDurationSec(
  state: DAWState,
  bpm: number,
  timeSignature: TimeSignature
): number {
  let durationSec = 0;

  for (const track of state.tracks) {
    for (const item of track.items) {
      const clipStartSec = positionToSeconds(item.position, bpm, timeSignature);

      if (item.type === "audio-clip") {
        durationSec = Math.max(
          durationSec,
          clipStartSec + resolveNumber(item.sourceDurationSec, { bpm })
        );
        continue;
      }

      for (const note of item.notes) {
        const noteStartSec =
          clipStartSec + positionToSeconds(note.position, bpm, timeSignature);
        const noteDurationSec = beatsToSeconds(
          Math.max(0, resolveNumber(note.durationInBeats, { bpm })),
          bpm
        );
        durationSec = Math.max(durationSec, noteStartSec + noteDurationSec);
      }
    }
  }

  return durationSec;
}

function getAllowedTrackIds(tracks: readonly Track[]): Set<string> {
  const soloTrackIds = tracks.filter((track) => track.solo).map((track) => track.id);

  if (soloTrackIds.length === 0) {
    return new Set(tracks.map((track) => track.id));
  }

  return new Set([
    ...soloTrackIds,
    ...tracks.filter((track) => track.kind === "master").map((track) => track.id)
  ]);
}

function positionToSeconds(
  position: Parameters<typeof musicalPositionToBeats>[0],
  bpm: number,
  timeSignature: TimeSignature
): number {
  return beatsToSeconds(musicalPositionToBeats(position, timeSignature), bpm);
}

function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

function beatsToMusicalPosition(
  beats: number,
  timeSignature: TimeSignature = DEFAULT_TIME_SIGNATURE
): Parameters<typeof musicalPositionToBeats>[0] {
  const [beatsPerBar] = timeSignature;
  const bar = Math.floor(beats / beatsPerBar) + 1;
  const beatOffset = beats % beatsPerBar;

  return {
    bar,
    beat: Math.floor(beatOffset) + 1,
    subBeat: beatOffset % 1
  };
}

function midiPitchToFrequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createAudioContext(): AudioContext {
  const AudioContextConstructor =
    globalThis.AudioContext ??
    (globalThis as typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (AudioContextConstructor === undefined) {
    throw new Error("Web Audio API is not available in this environment.");
  }

  return new AudioContextConstructor();
}
