import type { AudioClip } from "../types/audio/clips";
import type { AudioEffect } from "../types/audio/effects";
import type { AudioSource } from "../types/audio/sources";
import type { MidiClip } from "../types/midi/clip";
import type { MidiEffect } from "../types/midi/effects";
import type { MidiNote } from "../types/midi/note";
import type { MusicalPosition } from "../types/timeline";
import type { AudioBlock, Block, MidiBlock, Track, TrackItem, TrackKind } from "../types/track";
import { playDAWState } from "../audio/playDAWState";
import type {
  AudioClipInput,
  AudioBlockInput,
  AudioSourceInput,
  BlockInput,
  DAWOperator,
  DAWOptions,
  DAWState,
  DAWUpdateInput,
  EffectInput,
  MidiBlockInput,
  MidiClipInput,
  MidiNoteInput,
  TrackInput,
  TrackItemInput
} from "../types/daw";
import type { DAWPlayback, PlayDAWStateOptions } from "../types/audio";

type EntityLocation =
  | { kind: "clip"; clip: TrackItem; clipIndex: number; track: Track }
  | { kind: "note"; clip: MidiClip; note: MidiNote; noteIndex: number; track: Track }
  | { kind: "project" }
  | { kind: "source"; source: AudioSource; sourceIndex: number }
  | { kind: "track"; track: Track; trackIndex: number };

export type DAWInternals = {
  addClip: (clip?: TrackItemInput) => void;
  addEffect: (effect: EffectInput) => void;
  addNote: (note?: MidiNoteInput) => void;
  addSource: (source?: AudioSourceInput) => void;
  addTrack: (kindOrTrack?: TrackKind | TrackInput, patch?: TrackInput) => void;
  setClip: (patch: TrackItemInput) => void;
  setNote: (patch: MidiNoteInput) => void;
  setTrack: (patch: TrackInput) => void;
  setTrackEffect: (effect: EffectInput) => void;
};

export const DAW_INTERNALS: unique symbol = Symbol("DAW_INTERNALS");

const DEFAULT_POSITION: MusicalPosition = {
  bar: 1,
  beat: 1,
  subBeat: 0
};

let nextId = 0;

export class DAW {
  private readonly id: string;
  private currentClipId: string | undefined;
  private currentId: string;
  private currentNoteId: string | undefined;
  private currentTrackId: string | undefined;
  private readonly sources: AudioSource[] = [];
  private readonly tracks: Track[] = [];

  /**
   * Creates a DAW instance from optional initial state.
   * 선택적 초기 상태로 DAW 인스턴스를 생성함.
   */
  constructor(options: DAWOptions = {}) {
    this.id = options.id ?? createId("daw");
    this.currentId = this.id;

    for (const source of toArray(options.source)) {
      this.internalAddSource(source);
    }

    for (const source of options.sources ?? []) {
      this.internalAddSource(source);
    }

    for (const track of toArray(options.track)) {
      this.internalAddTrack(track);
    }

    for (const track of options.tracks ?? []) {
      this.internalAddTrack(track);
    }
  }

  /**
   * Applies an operator and returns this DAW for chaining.
   * 오퍼레이터를 적용하고 체이닝을 위해 현재 DAW를 반환함.
   */
  call(operator: DAWOperator<this>): this {
    operator(this);

    return this;
  }

  /**
   * Renders the current project state into a Web Audio graph and starts playback.
   * 현재 프로젝트 상태를 Web Audio 그래프로 렌더링하고 재생을 시작함.
   */
  play(options: PlayDAWStateOptions = {}): Promise<DAWPlayback> {
    return playDAWState(this.getState(), options);
  }

  /**
   * Gets a clip by id or the current clip.
   * id로 클립을 가져오거나 현재 클립을 가져옴.
   */
  getClip(id = this.currentClipId): TrackItem | undefined {
    if (id === undefined) {
      return undefined;
    }

    const location = this.findEntity(id);

    return location?.kind === "clip" ? cloneValue(location.clip) : undefined;
  }

  /**
   * Gets the selected clip id.
   * 선택된 클립 id를 가져옴.
   */
  getClipId(): string | undefined {
    return this.currentClipId;
  }

  /**
   * Gets the selected entity id.
   * 선택된 엔티티 id를 가져옴.
   */
  getId(): string {
    return this.currentId;
  }

  /**
   * Gets a MIDI note by id or the current note.
   * id로 MIDI 노트를 가져오거나 현재 노트를 가져옴.
   */
  getNode(id = this.currentNoteId): MidiNote | undefined {
    if (id === undefined) {
      return undefined;
    }

    const location = this.findEntity(id);

    return location?.kind === "note" ? cloneValue(location.note) : undefined;
  }

  /**
   * Gets the selected MIDI note id.
   * 선택된 MIDI 노트 id를 가져옴.
   */
  getNodeId(): string | undefined {
    return this.currentNoteId;
  }

  /**
   * Gets the project id.
   * 프로젝트 id를 가져옴.
   */
  getProjectId(): string {
    return this.id;
  }

  /**
   * Gets an audio source by id.
   * id로 오디오 소스를 가져옴.
   */
  getSource(id: string): AudioSource | undefined {
    const location = this.findEntity(id);

    return location?.kind === "source" ? cloneValue(location.source) : undefined;
  }

  /**
   * Gets all audio sources.
   * 모든 오디오 소스를 가져옴.
   */
  getSources(): AudioSource[] {
    return cloneValue(this.sources);
  }

  /**
   * Gets a serializable snapshot of the project.
   * 직렬화 가능한 프로젝트 스냅샷을 가져옴.
   */
  getState(): DAWState {
    return {
      id: this.id,
      sources: this.getSources(),
      tracks: this.getTracks()
    };
  }

  /**
   * Gets a track by id or the current track.
   * id로 트랙을 가져오거나 현재 트랙을 가져옴.
   */
  getTrack(id = this.currentTrackId): Track | undefined {
    if (id === undefined) {
      return undefined;
    }

    const location = this.findEntity(id);

    return location?.kind === "track" ? cloneValue(location.track) : undefined;
  }

  /**
   * Gets the selected track id.
   * 선택된 트랙 id를 가져옴.
   */
  getTrackId(): string | undefined {
    return this.currentTrackId;
  }

  /**
   * Gets all tracks.
   * 모든 트랙을 가져옴.
   */
  getTracks(): Track[] {
    return cloneValue(this.tracks);
  }

  /**
   * Removes an entity by id or the current entity.
   * id로 엔티티를 삭제하거나 현재 엔티티를 삭제함.
   */
  remove(id = this.currentId): this {
    const location = this.findEntity(id);

    if (location === undefined || location.kind === "project") {
      return this;
    }

    if (location.kind === "source") {
      this.sources.splice(location.sourceIndex, 1);
      this.selectProject();
      return this;
    }

    if (location.kind === "track") {
      this.tracks.splice(location.trackIndex, 1);
      this.selectProject();
      return this;
    }

    if (location.kind === "clip") {
      const track = location.track;
      track.items.splice(location.clipIndex, 1);
      this.selectTrack(track);
      return this;
    }

    const clip = location.clip;
    clip.notes.splice(location.noteIndex, 1);
    this.selectClip(location.track, clip);

    return this;
  }

  /**
   * Selects an entity for later chained operations.
   * 이후 체이닝 작업을 위해 엔티티를 선택함.
   */
  select(id: string): this {
    const location = this.findEntity(id);

    if (location === undefined) {
      throw new Error(`Cannot find entity with id "${id}".`);
    }

    this.selectLocation(location);

    return this;
  }

  /**
   * Converts the project into a JSON-friendly state object.
   * 프로젝트를 JSON 친화적인 상태 객체로 변환함.
   */
  toJSON(): DAWState {
    return this.getState();
  }

  /**
   * Updates the current entity or an entity by id.
   * 현재 엔티티 또는 id로 찾은 엔티티를 업데이트함.
   */
  update(patch: DAWUpdateInput): this;
  update(id: string, patch: DAWUpdateInput): this;
  update(idOrPatch: string | DAWUpdateInput, maybePatch?: DAWUpdateInput): this {
    const id = typeof idOrPatch === "string" ? idOrPatch : this.currentId;
    const patch = typeof idOrPatch === "string" ? maybePatch : idOrPatch;

    if (patch === undefined) {
      return this;
    }

    const location = this.findEntity(id);

    if (location === undefined || location.kind === "project") {
      return this;
    }

    if (location.kind === "source") {
      applyDefinedPatch(location.source, patch);
      this.selectSource(location.source);
      return this;
    }

    if (location.kind === "track") {
      applyTrackPatch(location.track, patch as TrackInput);
      this.selectTrack(location.track);
      return this;
    }

    if (location.kind === "clip") {
      applyClipPatch(location.clip, patch as TrackItemInput);
      this.selectClip(location.track, location.clip);
      return this;
    }

    applyDefinedPatch(location.note, patch);
    this.selectNote(location.track, location.clip, location.note);

    return this;
  }

  [DAW_INTERNALS](): DAWInternals {
    return {
      addClip: (clip = {}) => this.internalAddClip(clip),
      addEffect: (effect) => this.internalAddEffect(effect),
      addNote: (note = {}) => this.internalAddNote(note),
      addSource: (source = {}) => this.internalAddSource(source),
      addTrack: (kindOrTrack = "audio", patch = {}) =>
        this.internalAddTrack(kindOrTrack, patch),
      setClip: (patch) => this.updateCurrentClip(patch),
      setNote: (patch) => this.updateCurrentNote(patch),
      setTrack: (patch) => this.updateCurrentTrack(patch),
      setTrackEffect: (effect) => this.internalSetTrackEffect(effect)
    };
  }

  private ensureCurrentMidiClip(track: Track): MidiClip {
    if (this.currentClipId !== undefined) {
      const currentClip = this.findClip(track, this.currentClipId);

      if (currentClip?.type === "midi-clip") {
        return currentClip;
      }
    }

    const lastMidiClip = [...track.items].reverse().find(
      (item): item is MidiClip => item.type === "midi-clip"
    );

    if (lastMidiClip !== undefined) {
      this.selectClip(track, lastMidiClip);
      return lastMidiClip;
    }

    const clip = normalizeMidiClip({});
    track.items.push(clip);
    this.selectClip(track, clip);

    return clip;
  }

  private ensureCurrentTrack(kindHint: TrackKind): Track {
    if (this.currentTrackId !== undefined) {
      const currentTrack = this.findTrack(this.currentTrackId);

      if (currentTrack !== undefined) {
        return currentTrack;
      }
    }

    this.internalAddTrack(kindHint);

    return this.requireCurrentTrack();
  }

  private findClip(track: Track, id: string): TrackItem | undefined {
    return track.items.find((item) => item.id === id);
  }

  private findEntity(id: string): EntityLocation | undefined {
    if (id === this.id) {
      return { kind: "project" };
    }

    const sourceIndex = this.sources.findIndex((source) => source.id === id);

    if (sourceIndex >= 0) {
      return {
        kind: "source",
        source: this.sources[sourceIndex] as AudioSource,
        sourceIndex
      };
    }

    for (const track of this.tracks) {
      const trackIndex = this.tracks.indexOf(track);

      if (track.id === id) {
        return { kind: "track", track, trackIndex };
      }

      for (const clip of track.items) {
        const clipIndex = track.items.indexOf(clip);

        if (clip.id === id) {
          return { clip, clipIndex, kind: "clip", track };
        }

        if (clip.type !== "midi-clip") {
          continue;
        }

        const noteIndex = clip.notes.findIndex((note) => note.id === id);

        if (noteIndex >= 0) {
          return {
            clip,
            kind: "note",
            note: clip.notes[noteIndex] as MidiNote,
            noteIndex,
            track
          };
        }
      }
    }

    return undefined;
  }

  private findTrack(id: string): Track | undefined {
    return this.tracks.find((track) => track.id === id);
  }

  private internalAddClip(clip: TrackItemInput = {}): void {
    const track = this.ensureCurrentTrack(inferTrackKindFromClip(clip));

    if (track.kind === "bus" || track.kind === "master") {
      throw new Error(`${track.kind} tracks cannot contain clips.`);
    }

    const item = normalizeTrackItem(clip, track.kind);
    track.items.push(item);
    this.selectClip(track, item);
  }

  private internalAddEffect(effect: EffectInput): void {
    const track = this.requireCurrentTrack();
    const currentClip =
      this.currentClipId === undefined ? undefined : this.findClip(track, this.currentClipId);

    if (currentClip?.type === "midi-clip") {
      currentClip.midiEffects = [
        ...(currentClip.midiEffects ?? []),
        normalizeMidiEffect(effect)
      ];
      return;
    }

    if (currentClip?.type === "audio-clip") {
      currentClip.audioEffects = [
        ...(currentClip.audioEffects ?? []),
        normalizeAudioEffect(effect)
      ];
      return;
    }

    this.internalSetTrackEffect(effect);
  }

  private internalAddNote(note: MidiNoteInput = {}): void {
    const track = this.ensureCurrentTrack("midi");

    if (track.kind !== "midi" && track.kind !== "hybrid") {
      throw new Error(`${track.kind} tracks cannot contain MIDI notes.`);
    }

    const clip = this.ensureCurrentMidiClip(track);
    const nextNote = normalizeMidiNote(note);
    clip.notes.push(nextNote);
    this.selectNote(track, clip, nextNote);
  }

  private internalAddSource(source: AudioSourceInput = {}): void {
    const nextSource = normalizeAudioSource(source);
    this.sources.push(nextSource);
    this.selectSource(nextSource);
  }

  private internalAddTrack(
    kindOrTrack: TrackKind | TrackInput = "audio",
    patch: TrackInput = {}
  ): void {
    const track = normalizeTrack(kindOrTrack, patch, this.tracks.length);
    this.tracks.push(track);
    this.selectTrack(track);
  }

  private internalSetTrackEffect(effect: EffectInput): void {
    const track = this.requireCurrentTrack();

    if (track.kind === "midi") {
      track.midiEffects = [...(track.midiEffects ?? []), normalizeMidiEffect(effect)];
      return;
    }

    track.audioEffects = [...(track.audioEffects ?? []), normalizeAudioEffect(effect)];
  }

  private requireCurrentTrack(): Track {
    if (this.currentTrackId === undefined) {
      throw new Error("A track must be selected before calling this method.");
    }

    const track = this.findTrack(this.currentTrackId);

    if (track === undefined) {
      throw new Error(`Cannot find track with id "${this.currentTrackId}".`);
    }

    return track;
  }

  private selectClip(track: Track, clip: TrackItem): void {
    this.currentId = clip.id;
    this.currentTrackId = track.id;
    this.currentClipId = clip.id;
    this.currentNoteId =
      clip.type === "midi-clip" ? clip.notes.at(-1)?.id : undefined;
  }

  private selectLocation(location: EntityLocation): void {
    if (location.kind === "project") {
      this.selectProject();
      return;
    }

    if (location.kind === "source") {
      this.selectSource(location.source);
      return;
    }

    if (location.kind === "track") {
      this.selectTrack(location.track);
      return;
    }

    if (location.kind === "clip") {
      this.selectClip(location.track, location.clip);
      return;
    }

    this.selectNote(location.track, location.clip, location.note);
  }

  private selectNote(track: Track, clip: MidiClip, note: MidiNote): void {
    this.currentId = note.id;
    this.currentTrackId = track.id;
    this.currentClipId = clip.id;
    this.currentNoteId = note.id;
  }

  private selectProject(): void {
    this.currentId = this.id;
    this.currentClipId = undefined;
    this.currentNoteId = undefined;
    this.currentTrackId = undefined;
  }

  private selectSource(source: AudioSource): void {
    this.currentId = source.id;
    this.currentClipId = undefined;
    this.currentNoteId = undefined;
  }

  private selectTrack(track: Track): void {
    this.currentId = track.id;
    this.currentTrackId = track.id;
    this.currentClipId = undefined;
    this.currentNoteId = undefined;
  }

  private updateCurrentClip(patch: TrackItemInput): void {
    if (this.currentClipId === undefined) {
      throw new Error("A clip must be selected before calling this method.");
    }

    this.update(this.currentClipId, patch);
  }

  private updateCurrentNote(patch: MidiNoteInput): void {
    if (this.currentNoteId === undefined) {
      this.internalAddNote();
    }

    this.update(this.currentNoteId as string, patch);
  }

  private updateCurrentTrack(patch: TrackInput): void {
    if (this.currentTrackId === undefined) {
      throw new Error("A track must be selected before calling this method.");
    }

    this.update(this.currentTrackId, patch);
  }
}

export function createDAW(options: DAWOptions = {}): DAW {
  return new DAW(options);
}

function applyClipPatch(clip: TrackItem, patch: TrackItemInput): void {
  if (clip.type === "midi-clip") {
    const nextNotes = getMidiNoteInputs(patch as MidiClipInput);

    if (nextNotes !== undefined) {
      clip.notes = nextNotes.map(normalizeMidiNote);
    }
  }

  applyDefinedPatch(clip, patch);
}

function applyDefinedPatch<T extends object>(target: T, patch: object): void {
  for (const [key, value] of Object.entries(patch)) {
    if (
      value === undefined ||
      key === "Block" ||
      key === "items" ||
      key === "MidiNote" ||
      key === "midiNotes" ||
      key === "notes"
    ) {
      continue;
    }

    (target as Record<string, unknown>)[key] = cloneValue(value);
  }
}

function applyTrackPatch(track: Track, patch: TrackInput): void {
  if (patch.Block !== undefined) {
    track.Block = patch.Block.map((block) => normalizeBlock(block, track.kind));
  }

  if (patch.items !== undefined) {
    track.items = patch.items.map((item) => normalizeTrackItem(item, track.kind));
  }

  applyDefinedPatch(track, patch);
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(cloneValue) as T;
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const clone: Record<string, unknown> = {};

  for (const [key, childValue] of Object.entries(value)) {
    clone[key] = cloneValue(childValue);
  }

  return clone as T;
}

function createId(prefix: string): string {
  nextId += 1;

  return `${prefix}-${nextId}`;
}

function getMidiNoteInputs(input: MidiClipInput): readonly MidiNoteInput[] | undefined {
  return input.notes ?? input.MidiNote ?? input.midiNotes;
}

function hasKey(value: unknown, key: string): boolean {
  return typeof value === "object" && value !== null && key in value;
}

function inferClipType(
  input: TrackItemInput,
  trackKind: TrackKind
): TrackItem["type"] {
  if (hasKey(input, "type")) {
    return (input as TrackItem).type;
  }

  if (hasKey(input, "notes") || hasKey(input, "MidiNote") || hasKey(input, "midiNotes")) {
    return "midi-clip";
  }

  if (hasKey(input, "sourceId") || hasKey(input, "sourceStartSec")) {
    return "audio-clip";
  }

  return trackKind === "midi" ? "midi-clip" : "audio-clip";
}

function inferTrackKind(input: TrackInput): TrackKind {
  if (input.kind !== undefined) {
    return input.kind;
  }

  const firstItem = input.items?.[0];

  if (firstItem !== undefined && inferClipType(firstItem, "audio") === "midi-clip") {
    return "midi";
  }

  return "audio";
}

function inferTrackKindFromClip(input: TrackItemInput): TrackKind {
  return inferClipType(input, "audio") === "midi-clip" ? "midi" : "audio";
}

function inferBlockType(input: BlockInput, trackKind: TrackKind): Block["type"] {
  if (input.type !== undefined) {
    return input.type;
  }

  if (hasKey(input, "notes")) {
    return "midi-block";
  }

  if (hasKey(input, "audioFile") || hasKey(input, "sourceStartSec") || hasKey(input, "sourceEndSec")) {
    return "audio-block";
  }

  return trackKind === "midi" ? "midi-block" : "audio-block";
}

function isMidiEffect(effect: EffectInput): effect is MidiEffect {
  return (
    typeof effect === "object" &&
    effect !== null &&
    "type" in effect &&
    ["note-range-filter", "quantize", "transpose", "velocity-compress"].includes(
      String(effect.type)
    )
  );
}

function normalizeAudioClip(input: AudioClipInput = {}): AudioClip {
  const clip: AudioClip = {
    id: input.id ?? createId("audio-clip"),
    position: normalizePosition(input.position),
    sourceDurationSec: input.sourceDurationSec ?? 0,
    sourceId: input.sourceId ?? createId("audio-source"),
    sourceStartSec: input.sourceStartSec ?? 0,
    type: "audio-clip"
  };

  applyOptional(clip, "audioEffects", input.audioEffects);
  applyOptional(clip, "fadeInSec", input.fadeInSec);
  applyOptional(clip, "fadeOutSec", input.fadeOutSec);
  applyOptional(clip, "gain", input.gain);
  applyOptional(clip, "muted", input.muted);
  applyOptional(clip, "pan", input.pan);
  applyOptional(clip, "playbackRate", input.playbackRate);

  return clip;
}

function normalizeAudioEffect(effect: EffectInput): AudioEffect {
  if (typeof effect === "number") {
    return {
      frequency: effect,
      filterType: "lowpass",
      type: "filter"
    };
  }

  if (isMidiEffect(effect)) {
    return {
      ratio: Math.max(1, "amount" in effect ? effect.amount : 1),
      threshold: "semitones" in effect ? -Math.abs(effect.semitones) : -24,
      type: "compressor"
    };
  }

  return cloneValue(effect);
}

function normalizeAudioSource(input: AudioSourceInput = {}): AudioSource {
  const source: AudioSource = {
    durationSec: input.durationSec ?? 0,
    id: input.id ?? createId("audio-source"),
    kind: "audio-source",
    uri: input.uri ?? ""
  };

  applyOptional(source, "channelCount", input.channelCount);
  applyOptional(source, "fileName", input.fileName);
  applyOptional(source, "sampleRate", input.sampleRate);

  return source;
}

function normalizeBlock(input: BlockInput = {}, trackKind: TrackKind): Block {
  const type = inferBlockType(input, trackKind);

  if (type === "midi-block") {
    return normalizeMidiBlock(input as MidiBlockInput);
  }

  return normalizeAudioBlock(input as AudioBlockInput);
}

function normalizeMidiBlock(input: MidiBlockInput = {}): MidiBlock {
  const startBeat = input.startBeat ?? 0;

  return {
    endBeat: Math.max(startBeat, input.endBeat ?? startBeat + 4),
    id: input.id ?? createId("midi-block"),
    loop: input.loop ?? false,
    notes: (input.notes ?? []).map(normalizeMidiNote),
    startBeat,
    title: input.title ?? "MIDI Block",
    type: "midi-block"
  };
}

function normalizeAudioBlock(input: AudioBlockInput = {}): AudioBlock {
  const startBeat = input.startBeat ?? 0;
  const audioFile = cloneValue(input.audioFile ?? {});

  return {
    audioFile,
    endBeat: Math.max(startBeat, input.endBeat ?? startBeat + 4),
    id: input.id ?? createId("audio-block"),
    loop: input.loop ?? false,
    sourceEndSec: input.sourceEndSec ?? audioFile.durationSec ?? 0,
    sourceStartSec: input.sourceStartSec ?? 0,
    startBeat,
    title: input.title ?? audioFile.fileName ?? "Audio Block",
    type: "audio-block"
  };
}

function normalizeMidiClip(input: MidiClipInput = {}): MidiClip {
  const clip: MidiClip = {
    id: input.id ?? createId("midi-clip"),
    notes: (getMidiNoteInputs(input) ?? []).map(normalizeMidiNote),
    position: normalizePosition(input.position),
    type: "midi-clip"
  };

  applyOptional(clip, "midiEffects", input.midiEffects);
  applyOptional(clip, "muted", input.muted);

  return clip;
}

function normalizeMidiEffect(effect: EffectInput): MidiEffect {
  if (typeof effect === "number") {
    return {
      semitones: effect,
      type: "transpose"
    };
  }

  if (isMidiEffect(effect)) {
    return cloneValue(effect);
  }

  return {
    grid: "frequency" in effect && typeof effect.frequency === "number" ? effect.frequency : 1,
    type: "quantize"
  };
}

function normalizeMidiNote(input: MidiNoteInput = {}): MidiNote {
  const note: MidiNote = {
    durationInBeats: input.durationInBeats ?? 1,
    id: input.id ?? createId("midi-note"),
    pitch: input.pitch ?? 60,
    position: normalizePosition(input.position),
    velocity: input.velocity ?? 100
  };

  applyOptional(note, "muted", input.muted);

  return note;
}

function normalizePosition(position: Partial<MusicalPosition> = {}): MusicalPosition {
  return {
    bar: position.bar ?? DEFAULT_POSITION.bar,
    beat: position.beat ?? DEFAULT_POSITION.beat,
    subBeat: position.subBeat ?? DEFAULT_POSITION.subBeat
  };
}

function normalizeTrack(
  kindOrTrack: TrackKind | TrackInput,
  patch: TrackInput,
  order: number
): Track {
  const input: TrackInput =
    typeof kindOrTrack === "string" ? { ...patch, kind: kindOrTrack } : kindOrTrack;
  const kind = inferTrackKind(input);
  const track: Track = {
    Block: (input.Block ?? []).map((block) => normalizeBlock(block, kind)),
    id: input.id ?? createId("track"),
    items: (input.items ?? []).map((item) => normalizeTrackItem(item, kind)),
    kind,
    muted: input.muted ?? false,
    name: input.name ?? defaultTrackName(kind, order),
    order: input.order ?? order,
    pan: input.pan ?? 0,
    solo: input.solo ?? false,
    volume: input.volume ?? 1
  };

  applyOptional(track, "armed", input.armed);
  applyOptional(track, "audioEffects", input.audioEffects);
  applyOptional(track, "bypassed", input.bypassed);
  applyOptional(track, "color", input.color);
  applyOptional(track, "instrumentId", input.instrumentId);
  applyOptional(track, "midiEffects", input.midiEffects);
  applyOptional(track, "output", input.output);

  return track;
}

function normalizeTrackItem(input: TrackItemInput = {}, trackKind: TrackKind): TrackItem {
  const type = inferClipType(input, trackKind);

  if (type === "midi-clip") {
    return normalizeMidiClip(input as MidiClipInput);
  }

  return normalizeAudioClip(input as AudioClipInput);
}

function defaultTrackName(kind: TrackKind, order: number): string {
  return kind === "master" ? "Master" : `${kind} ${order + 1}`;
}

function applyOptional<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined
): void {
  if (value !== undefined) {
    target[key] = cloneValue(value);
  }
}

function toArray<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? (value as readonly T[]) : [value as T];
}
