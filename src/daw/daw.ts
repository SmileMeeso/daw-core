import type { AudioClip } from "../types/audio/clips";
import type { AudioEffect } from "../types/audio/effects";
import type { AudioSource } from "../types/audio/sources";
import type { MidiClip } from "../types/midi/clip";
import type { MidiEffect } from "../types/midi/effects";
import type { MidiNote } from "../types/midi/note";
import type { MusicalPosition } from "../types/timeline";
import type { Track, TrackItem, TrackKind } from "../types/track";
import type {
  AudioClipInput,
  AudioSourceInput,
  DAWOptions,
  DAWState,
  DAWUpdateInput,
  EffectInput,
  MidiClipInput,
  MidiNoteInput,
  TrackInput,
  TrackItemInput
} from "./types";

type EntityLocation =
  | { kind: "clip"; clip: TrackItem; clipIndex: number; track: Track; trackIndex: number }
  | { kind: "note"; clip: MidiClip; note: MidiNote; noteIndex: number; track: Track; trackIndex: number }
  | { kind: "project" }
  | { kind: "source"; source: AudioSource; sourceIndex: number }
  | { kind: "track"; track: Track; trackIndex: number };

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
      this.addSource(source);
    }

    for (const source of options.sources ?? []) {
      this.addSource(source);
    }

    for (const track of toArray(options.track)) {
      this.addTrack(track);
    }

    for (const track of options.tracks ?? []) {
      this.addTrack(track);
    }
  }

  /**
   * Adds a clip to the current track.
   * 현재 트랙에 클립을 추가함.
   */
  addClip(clip: TrackItemInput = {}): this {
    const track = this.ensureCurrentTrack(inferTrackKindFromClip(clip));

    if (track.kind === "bus" || track.kind === "master") {
      throw new Error(`${track.kind} tracks cannot contain clips.`);
    }

    const item = normalizeTrackItem(clip, track.kind);
    track.items.push(item);
    this.selectClip(track, item);

    return this;
  }

  /**
   * Adds an effect to the selected clip or track.
   * 선택된 클립 또는 트랙에 이펙트를 추가함.
   */
  addEffect(effect: EffectInput): this {
    return this.setEffect(effect);
  }

  /**
   * Adds a MIDI note node to the current MIDI clip.
   * 현재 MIDI 클립에 MIDI 노트 노드를 추가함.
   */
  addNode(note: MidiNoteInput = {}): this {
    return this.addNote(note);
  }

  /**
   * Adds a MIDI note to the current MIDI clip.
   * 현재 MIDI 클립에 MIDI 노트를 추가함.
   */
  addNote(note: MidiNoteInput = {}): this {
    const track = this.ensureCurrentTrack("midi");

    if (track.kind !== "midi" && track.kind !== "hybrid") {
      throw new Error(`${track.kind} tracks cannot contain MIDI notes.`);
    }

    const clip = this.ensureCurrentMidiClip(track);
    const nextNote = normalizeMidiNote(note);
    clip.notes.push(nextNote);
    this.selectNote(track, clip, nextNote);

    return this;
  }

  /**
   * Sets pitch on the current MIDI note.
   * 현재 MIDI 노트의 피치를 설정함.
   */
  addPitch(pitch: number): this {
    return this.setPitch(pitch);
  }

  /**
   * Adds an audio source to the project.
   * 프로젝트에 오디오 소스를 추가함.
   */
  addSource(source: AudioSourceInput = {}): this {
    const nextSource = normalizeAudioSource(source);
    this.sources.push(nextSource);
    this.selectSource(nextSource);

    return this;
  }

  /**
   * Adds a track and selects it for chaining.
   * 트랙을 추가하고 체이닝 대상으로 선택함.
   */
  addTrack(kindOrTrack: TrackKind | TrackInput = "audio", patch: TrackInput = {}): this {
    const track = normalizeTrack(kindOrTrack, patch, this.tracks.length);
    this.tracks.push(track);
    this.selectTrack(track);

    return this;
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
      location.track.items.splice(location.clipIndex, 1);
      this.selectTrack(location.track);
      return this;
    }

    location.clip.notes.splice(location.noteIndex, 1);
    this.selectClip(location.track, location.clip);

    return this;
  }

  /**
   * Removes a clip by id or the current clip.
   * id로 클립을 삭제하거나 현재 클립을 삭제함.
   */
  removeClip(id = this.currentClipId): this {
    if (id !== undefined) {
      this.remove(id);
    }

    return this;
  }

  /**
   * Removes a MIDI note node by id or the current node.
   * id로 MIDI 노트 노드를 삭제하거나 현재 노드를 삭제함.
   */
  removeNode(id = this.currentNoteId): this {
    if (id !== undefined) {
      this.remove(id);
    }

    return this;
  }

  /**
   * Removes a MIDI note by id or the current note.
   * id로 MIDI 노트를 삭제하거나 현재 노트를 삭제함.
   */
  removeNote(id = this.currentNoteId): this {
    return this.removeNode(id);
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
   * Selects a track by id.
   * id로 트랙을 선택함.
   */
  selectTrackById(id: string): this {
    const location = this.findEntity(id);

    if (location?.kind !== "track") {
      throw new Error(`Cannot find track with id "${id}".`);
    }

    this.selectTrack(location.track);

    return this;
  }

  /**
   * Sets whether the current track is armed.
   * 현재 트랙의 녹음 대기 상태를 설정함.
   */
  setArmed(armed: boolean): this {
    return this.updateCurrentTrack({ armed });
  }

  /**
   * Sets whether the current track is bypassed.
   * 현재 트랙의 바이패스 상태를 설정함.
   */
  setBypassed(bypassed: boolean): this {
    return this.updateCurrentTrack({ bypassed });
  }

  /**
   * Sets gain on the current audio clip.
   * 현재 오디오 클립의 게인을 설정함.
   */
  setClipGain(gain: number): this {
    return this.updateCurrentClip({ gain });
  }

  /**
   * Sets pan on the current audio clip.
   * 현재 오디오 클립의 팬을 설정함.
   */
  setClipPan(pan: number): this {
    return this.updateCurrentClip({ pan });
  }

  /**
   * Sets the current track color.
   * 현재 트랙 색상을 설정함.
   */
  setColor(color: string): this {
    return this.updateCurrentTrack({ color });
  }

  /**
   * Sets duration on the current MIDI note.
   * 현재 MIDI 노트의 길이를 설정함.
   */
  setDurationInBeats(durationInBeats: number): this {
    return this.updateCurrentNote({ durationInBeats });
  }

  /**
   * Adds an effect to the current clip, or to the track when no clip is selected.
   * 현재 클립에 이펙트를 추가하고, 클립이 없으면 트랙에 추가함.
   */
  setEffect(effect: EffectInput): this {
    const track = this.requireCurrentTrack();
    const currentClip = this.currentClipId === undefined ? undefined : this.findClip(track, this.currentClipId);

    if (currentClip?.type === "midi-clip") {
      currentClip.midiEffects = [
        ...(currentClip.midiEffects ?? []),
        normalizeMidiEffect(effect)
      ];
      return this;
    }

    if (currentClip?.type === "audio-clip") {
      currentClip.audioEffects = [
        ...(currentClip.audioEffects ?? []),
        normalizeAudioEffect(effect)
      ];
      return this;
    }

    return this.setTrackEffect(effect);
  }

  /**
   * Sets fade-in time on the current audio clip.
   * 현재 오디오 클립의 페이드인 시간을 설정함.
   */
  setFadeIn(fadeInSec: number): this {
    return this.updateCurrentClip({ fadeInSec });
  }

  /**
   * Sets fade-out time on the current audio clip.
   * 현재 오디오 클립의 페이드아웃 시간을 설정함.
   */
  setFadeOut(fadeOutSec: number): this {
    return this.updateCurrentClip({ fadeOutSec });
  }

  /**
   * Sets the instrument id on the current track.
   * 현재 트랙의 악기 id를 설정함.
   */
  setInstrumentId(instrumentId: string): this {
    return this.updateCurrentTrack({ instrumentId });
  }

  /**
   * Sets muted state on the current note, clip, or track.
   * 현재 노트, 클립 또는 트랙의 음소거 상태를 설정함.
   */
  setMuted(muted: boolean): this {
    const current = this.findEntity(this.currentId);

    if (current?.kind === "clip") {
      return this.updateCurrentClip({ muted });
    }

    if (current?.kind === "note") {
      return this.updateCurrentNote({ muted });
    }

    return this.updateCurrentTrack({ muted });
  }

  /**
   * Sets the current track name.
   * 현재 트랙 이름을 설정함.
   */
  setName(name: string): this {
    return this.updateCurrentTrack({ name });
  }

  /**
   * Sets the current track order.
   * 현재 트랙 순서를 설정함.
   */
  setOrder(order: number): this {
    return this.updateCurrentTrack({ order });
  }

  /**
   * Sets the current track output destination.
   * 현재 트랙의 출력 대상을 설정함.
   */
  setOutput(destinationTrackId: string | undefined): this {
    return this.updateCurrentTrack({
      output: destinationTrackId === undefined ? {} : { destinationTrackId }
    });
  }

  /**
   * Sets pan on the current audio clip or track.
   * 현재 오디오 클립 또는 트랙의 팬을 설정함.
   */
  setPan(pan: number): this {
    const current = this.findEntity(this.currentId);

    if (current?.kind === "clip" && current.clip.type === "audio-clip") {
      current.clip.pan = pan;
      return this;
    }

    return this.updateCurrentTrack({ pan });
  }

  /**
   * Sets pitch on the current MIDI note.
   * 현재 MIDI 노트의 피치를 설정함.
   */
  setPitch(pitch: number): this {
    return this.updateCurrentNote({ pitch });
  }

  /**
   * Sets playback rate on the current audio clip.
   * 현재 오디오 클립의 재생 속도를 설정함.
   */
  setPlaybackRate(playbackRate: number): this {
    return this.updateCurrentClip({ playbackRate });
  }

  /**
   * Sets position on the current clip or MIDI note.
   * 현재 클립 또는 MIDI 노트의 위치를 설정함.
   */
  setPosition(position: Partial<MusicalPosition>): this {
    const nextPosition = normalizePosition(position);
    const current = this.findEntity(this.currentId);

    if (current?.kind === "clip") {
      current.clip.position = nextPosition;
      return this;
    }

    if (current?.kind === "note") {
      current.note.position = nextPosition;
      return this;
    }

    throw new Error("A clip or MIDI note must be selected before setting a position.");
  }

  /**
   * Sets solo state on the current track.
   * 현재 트랙의 솔로 상태를 설정함.
   */
  setSolo(solo: boolean): this {
    return this.updateCurrentTrack({ solo });
  }

  /**
   * Sets the source range on the current audio clip.
   * 현재 오디오 클립의 소스 재생 구간을 설정함.
   */
  setSourceRange(sourceStartSec: number, sourceDurationSec: number): this {
    return this.updateCurrentClip({ sourceDurationSec, sourceStartSec });
  }

  /**
   * Adds an effect directly to the current track.
   * 현재 트랙에 직접 이펙트를 추가함.
   */
  setTrackEffect(effect: EffectInput): this {
    const track = this.requireCurrentTrack();

    if (track.kind === "midi") {
      track.midiEffects = [...(track.midiEffects ?? []), normalizeMidiEffect(effect)];
      return this;
    }

    track.audioEffects = [...(track.audioEffects ?? []), normalizeAudioEffect(effect)];

    return this;
  }

  /**
   * Sets velocity on the current MIDI note.
   * 현재 MIDI 노트의 velocity를 설정함.
   */
  setVelocity(velocity: number): this {
    return this.updateCurrentNote({ velocity });
  }

  /**
   * Sets volume on the current track.
   * 현재 트랙의 볼륨을 설정함.
   */
  setVolume(volume: number): this {
    return this.updateCurrentTrack({ volume });
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

  /**
   * Updates a clip by id.
   * id로 클립을 업데이트함.
   */
  updateClip(id: string, patch: TrackItemInput): this {
    return this.update(id, patch);
  }

  /**
   * Updates a MIDI note node by id.
   * id로 MIDI 노트 노드를 업데이트함.
   */
  updateNode(id: string, patch: MidiNoteInput): this {
    return this.update(id, patch);
  }

  /**
   * Updates a MIDI note by id.
   * id로 MIDI 노트를 업데이트함.
   */
  updateNote(id: string, patch: MidiNoteInput): this {
    return this.updateNode(id, patch);
  }

  /**
   * Ensures a MIDI clip exists on the current track.
   * 현재 트랙에 MIDI 클립이 있도록 보장함.
   */
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

  /**
   * Ensures a current track exists, creating one when needed.
   * 현재 트랙이 없으면 생성해서 보장함.
   */
  private ensureCurrentTrack(kindHint: TrackKind): Track {
    if (this.currentTrackId !== undefined) {
      const currentTrack = this.findTrack(this.currentTrackId);

      if (currentTrack !== undefined) {
        return currentTrack;
      }
    }

    this.addTrack(kindHint);

    return this.requireCurrentTrack();
  }

  /**
   * Finds a clip inside a track by id.
   * 트랙 안에서 id로 클립을 찾음.
   */
  private findClip(track: Track, id: string): TrackItem | undefined {
    return track.items.find((item) => item.id === id);
  }

  /**
   * Finds any project entity by id.
   * id로 프로젝트 내 엔티티를 찾음.
   */
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

    for (const [trackIndex, track] of this.tracks.entries()) {
      if (track.id === id) {
        return { kind: "track", track, trackIndex };
      }

      for (const [clipIndex, clip] of track.items.entries()) {
        if (clip.id === id) {
          return { clip, clipIndex, kind: "clip", track, trackIndex };
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
            track,
            trackIndex
          };
        }
      }
    }

    return undefined;
  }

  /**
   * Finds a track by id.
   * id로 트랙을 찾음.
   */
  private findTrack(id: string): Track | undefined {
    return this.tracks.find((track) => track.id === id);
  }

  /**
   * Returns the current track or throws.
   * 현재 트랙을 반환하거나 없으면 예외를 던짐.
   */
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

  /**
   * Marks a clip as the current chain target.
   * 클립을 현재 체이닝 대상으로 표시함.
   */
  private selectClip(track: Track, clip: TrackItem): void {
    this.currentId = clip.id;
    this.currentTrackId = track.id;
    this.currentClipId = clip.id;
    this.currentNoteId =
      clip.type === "midi-clip" ? clip.notes.at(-1)?.id : undefined;
  }

  /**
   * Selects an entity from a resolved location.
   * 확인된 위치 정보로 엔티티를 선택함.
   */
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

  /**
   * Marks a MIDI note as the current chain target.
   * MIDI 노트를 현재 체이닝 대상으로 표시함.
   */
  private selectNote(track: Track, clip: MidiClip, note: MidiNote): void {
    this.currentId = note.id;
    this.currentTrackId = track.id;
    this.currentClipId = clip.id;
    this.currentNoteId = note.id;
  }

  /**
   * Selects the project itself.
   * 프로젝트 자체를 선택함.
   */
  private selectProject(): void {
    this.currentId = this.id;
    this.currentClipId = undefined;
    this.currentNoteId = undefined;
    this.currentTrackId = undefined;
  }

  /**
   * Marks an audio source as the current chain target.
   * 오디오 소스를 현재 체이닝 대상으로 표시함.
   */
  private selectSource(source: AudioSource): void {
    this.currentId = source.id;
    this.currentClipId = undefined;
    this.currentNoteId = undefined;
  }

  /**
   * Marks a track as the current chain target.
   * 트랙을 현재 체이닝 대상으로 표시함.
   */
  private selectTrack(track: Track): void {
    this.currentId = track.id;
    this.currentTrackId = track.id;
    this.currentClipId = undefined;
    this.currentNoteId = undefined;
  }

  /**
   * Applies a patch to the current clip.
   * 현재 클립에 패치를 적용함.
   */
  private updateCurrentClip(patch: TrackItemInput): this {
    if (this.currentClipId === undefined) {
      throw new Error("A clip must be selected before calling this method.");
    }

    return this.update(this.currentClipId, patch);
  }

  /**
   * Applies a patch to the current MIDI note.
   * 현재 MIDI 노트에 패치를 적용함.
   */
  private updateCurrentNote(patch: MidiNoteInput): this {
    if (this.currentNoteId === undefined) {
      this.addNote();
    }

    return this.update(this.currentNoteId as string, patch);
  }

  /**
   * Applies a patch to the current track.
   * 현재 트랙에 패치를 적용함.
   */
  private updateCurrentTrack(patch: TrackInput): this {
    if (this.currentTrackId === undefined) {
      throw new Error("A track must be selected before calling this method.");
    }

    return this.update(this.currentTrackId, patch);
  }
}

/**
 * Applies a normalized patch to a clip.
 * 정규화된 패치를 클립에 적용함.
 */
function applyClipPatch(clip: TrackItem, patch: TrackItemInput): void {
  if (clip.type === "midi-clip") {
    const nextNotes = getMidiNoteInputs(patch as MidiClipInput);

    if (nextNotes !== undefined) {
      clip.notes = nextNotes.map(normalizeMidiNote);
    }
  }

  applyDefinedPatch(clip, patch);
}

/**
 * Copies defined patch values onto a target object.
 * 정의된 패치 값만 대상 객체에 복사함.
 */
function applyDefinedPatch<T extends object>(target: T, patch: object): void {
  for (const [key, value] of Object.entries(patch)) {
    if (
      value === undefined ||
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

/**
 * Applies a normalized patch to a track.
 * 정규화된 패치를 트랙에 적용함.
 */
function applyTrackPatch(track: Track, patch: TrackInput): void {
  if (patch.items !== undefined) {
    track.items = patch.items.map((item) => normalizeTrackItem(item, track.kind));
  }

  applyDefinedPatch(track, patch);
}

/**
 * Deep-clones serializable DAW state values.
 * 직렬화 가능한 DAW 상태 값을 깊은 복사함.
 */
function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Creates a deterministic runtime id.
 * 런타임에서 사용할 결정적 id를 생성함.
 */
function createId(prefix: string): string {
  nextId += 1;

  return `${prefix}-${nextId}`;
}

/**
 * Reads MIDI note inputs from supported aliases.
 * 지원하는 별칭에서 MIDI 노트 입력을 읽음.
 */
function getMidiNoteInputs(input: MidiClipInput): readonly MidiNoteInput[] | undefined {
  return input.notes ?? input.MidiNote ?? input.midiNotes;
}

/**
 * Checks whether an unknown value owns a key.
 * 알 수 없는 값이 특정 키를 갖는지 확인함.
 */
function hasKey(value: unknown, key: string): boolean {
  return typeof value === "object" && value !== null && key in value;
}

/**
 * Infers whether an input should become a MIDI or audio clip.
 * 입력이 MIDI 클립인지 오디오 클립인지 추론함.
 */
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

/**
 * Infers the best track kind from partial track input.
 * 부분 트랙 입력에서 적절한 트랙 종류를 추론함.
 */
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

/**
 * Infers the track kind needed for a clip input.
 * 클립 입력에 필요한 트랙 종류를 추론함.
 */
function inferTrackKindFromClip(input: TrackItemInput): TrackKind {
  return inferClipType(input, "audio") === "midi-clip" ? "midi" : "audio";
}

/**
 * Checks whether an effect input is a MIDI effect.
 * 이펙트 입력이 MIDI 이펙트인지 확인함.
 */
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

/**
 * Converts partial audio clip input into a full AudioClip.
 * 부분 오디오 클립 입력을 완전한 AudioClip으로 변환함.
 */
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

/**
 * Converts flexible effect input into an AudioEffect.
 * 유연한 이펙트 입력을 AudioEffect로 변환함.
 */
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

/**
 * Converts partial source input into a full AudioSource.
 * 부분 소스 입력을 완전한 AudioSource로 변환함.
 */
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

/**
 * Converts partial MIDI clip input into a full MidiClip.
 * 부분 MIDI 클립 입력을 완전한 MidiClip으로 변환함.
 */
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

/**
 * Converts flexible effect input into a MidiEffect.
 * 유연한 이펙트 입력을 MidiEffect로 변환함.
 */
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
    grid: "frequency" in effect ? effect.frequency : 1,
    type: "quantize"
  };
}

/**
 * Converts partial MIDI note input into a full MidiNote.
 * 부분 MIDI 노트 입력을 완전한 MidiNote로 변환함.
 */
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

/**
 * Fills missing musical position fields with defaults.
 * 빠진 음악 위치 필드를 기본값으로 채움.
 */
function normalizePosition(position: Partial<MusicalPosition> = {}): MusicalPosition {
  return {
    bar: position.bar ?? DEFAULT_POSITION.bar,
    beat: position.beat ?? DEFAULT_POSITION.beat,
    subBeat: position.subBeat ?? DEFAULT_POSITION.subBeat
  };
}

/**
 * Converts kind or partial track input into a full Track.
 * 트랙 종류 또는 부분 트랙 입력을 완전한 Track으로 변환함.
 */
function normalizeTrack(
  kindOrTrack: TrackKind | TrackInput,
  patch: TrackInput,
  order: number
): Track {
  const input: TrackInput =
    typeof kindOrTrack === "string" ? { ...patch, kind: kindOrTrack } : kindOrTrack;
  const kind = inferTrackKind(input);
  const track: Track = {
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

/**
 * Converts partial clip input into a concrete track item.
 * 부분 클립 입력을 구체적인 트랙 아이템으로 변환함.
 */
function normalizeTrackItem(input: TrackItemInput = {}, trackKind: TrackKind): TrackItem {
  const type = inferClipType(input, trackKind);

  if (type === "midi-clip") {
    return normalizeMidiClip(input as MidiClipInput);
  }

  return normalizeAudioClip(input as AudioClipInput);
}

/**
 * Builds a default track name.
 * 기본 트랙 이름을 만듦.
 */
function defaultTrackName(kind: TrackKind, order: number): string {
  return kind === "master" ? "Master" : `${kind} ${order + 1}`;
}

/**
 * Assigns an optional value only when it is defined.
 * 값이 정의된 경우에만 선택 속성을 할당함.
 */
function applyOptional<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined
): void {
  if (value !== undefined) {
    target[key] = cloneValue(value);
  }
}

/**
 * Wraps an optional single value into an array.
 * 선택적 단일 값을 배열로 감쌈.
 */
function toArray<T>(value: T | readonly T[] | undefined): readonly T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? (value as readonly T[]) : [value as T];
}
