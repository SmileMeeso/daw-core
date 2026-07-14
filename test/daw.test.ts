import { describe, expect, it } from "vitest";

import {
  DAW,
  clip,
  createDAW,
  effect,
  note,
  renderAudioAutomationCurve,
  remove,
  track as trackOps,
  update
} from "../src";
import type { AudioClip, AudioEffect, AudioParamAutomation, MidiClip } from "../src";

const position = {
  bar: 1,
  beat: 1,
  subBeat: 0
};

function audioClip(id: string): AudioClip {
  return {
    id,
    position,
    sourceDurationSec: 4,
    sourceId: `source-${id}`,
    sourceStartSec: 0,
    type: "audio-clip"
  };
}

function midiClip(id: string): MidiClip {
  return {
    id,
    notes: [],
    position,
    type: "midi-clip"
  };
}

describe("DAW", () => {
  it("chains audio track clip edits and id-based updates", () => {
    const daw = new DAW();

    daw
      .call(trackOps.add("audio"))
      .call(clip.add(audioClip("clip-a")))
      .call(clip.add(audioClip("clip-b")))
      .call(effect.add(50));

    const clipId = daw.getId();

    daw.call(update(clipId, { gain: 0.5 })).call(remove(clipId));

    const [track] = daw.getTracks();

    expect(track?.items).toHaveLength(1);
    expect(track?.items[0]?.id).toBe("clip-a");
  });

  it("chains midi clip and note edits", () => {
    const daw = createDAW();

    daw
      .call(trackOps.add("midi"))
      .call(clip.add(midiClip("clip-a")))
      .call(note.add())
      .call(note.pitch(100))
      .call(clip.add(midiClip("clip-b")));

    const [track] = daw.getTracks();
    const firstClip = track?.items[0] as MidiClip;

    expect(track?.items).toHaveLength(2);
    expect(firstClip.notes).toHaveLength(1);
    expect(firstClip.notes[0]?.pitch).toBe(100);
  });

  it("chains master track volume and effects", () => {
    const eq: AudioEffect = effect.lowpass(1_000);
    const compressor: AudioEffect = effect.compressor({
      ratio: 4,
      threshold: -18
    });

    const daw = createDAW();

    daw
      .call(trackOps.add("master"))
      .call(trackOps.volume(50))
      .call(effect.add(eq))
      .call(effect.add(compressor));

    const [track] = daw.getTracks();

    expect(track?.volume).toBe(50);
    expect(track?.audioEffects).toEqual([eq, compressor]);
  });

  it("creates common audio effects", () => {
    expect(effect.lowpass(2_000, { qFactor: 0.7 })).toEqual({
      filterType: "lowpass",
      frequency: 2_000,
      qFactor: 0.7,
      type: "filter"
    });
    expect(effect.highpass(120)).toEqual({
      filterType: "highpass",
      frequency: 120,
      type: "filter"
    });
    expect(effect.eq(500, "highpass")).toEqual({
      filterType: "highpass",
      frequency: 500,
      type: "filter"
    });
    expect(effect.bandpass(760, { qFactor: 2 })).toEqual({
      filterType: "bandpass",
      frequency: 760,
      qFactor: 2,
      type: "filter"
    });
    expect(effect.delay({ delayTime: 0.3, feedback: 0.4, mix: 0.5 })).toEqual({
      delayTime: 0.3,
      feedback: 0.4,
      mix: 0.5,
      type: "delay"
    });
    expect(effect.chorus({ depth: 0.004, rate: 1.8 })).toEqual({
      delayTime: 0.018,
      depth: 0.004,
      mix: 0.45,
      rate: 1.8,
      type: "chorus"
    });
    expect(effect.limiter(-0.5)).toEqual({
      attack: 0.003,
      ratio: 20,
      release: 0.1,
      threshold: -0.5,
      type: "compressor"
    });
  });

  it("creates beat-based curved audio effect automation", () => {
    const frequency = effect.curveDownFromBeat(2_000, 200, {
      durationBeats: 4,
      sampleCount: 5,
      startBeat: 8
    });
    const rendered = renderAudioAutomationCurve(frequency, { bpm: 120 });

    expect(effect.lowpass(frequency)).toEqual({
      filterType: "lowpass",
      frequency,
      type: "filter"
    });
    expect(rendered.startSec).toBe(4);
    expect(rendered.durationSec).toBe(2);
    expect(Array.from(rendered.values)).toEqual([
      2_000,
      1_718.75,
      1_100,
      481.25,
      200
    ]);
  });

  it("accepts inline compressor automation without calling timeFunction", () => {
    const compressor = effect.compressor({
      ratio: 4,
      threshold: [
        (_timeSec, progress) => -12 + (-36 - -12) * progress,
        {
          curve: "smoothstep",
          durationSec: 2,
          sampleCount: 3,
          startSec: 8
        }
      ]
    });

    expect(compressor.threshold).toMatchObject({
      durationSec: 2,
      kind: "time-function",
      startSec: 8
    });

    if (typeof compressor.threshold === "number") {
      throw new Error("Expected automated threshold.");
    }

    const rendered = renderAudioAutomationCurve(compressor.threshold);

    expect(Array.from(rendered.values)).toEqual([-12, -24, -36]);
  });

  it("accepts inline automation in track clip and note operators", () => {
    const daw = createDAW();

    daw
      .call(trackOps.add("audio"))
      .call(trackOps.volume([
        (_timeSec, progress) => 0.25 + 0.75 * progress,
        {
          durationSec: 2,
          sampleCount: 3,
          startSec: 1
        }
      ]))
      .call(clip.add(audioClip("clip-a")))
      .call(clip.gain({
        curve: "smoothstep",
        durationSec: 1,
        sampleCount: 3,
        startSec: 0,
        valueAt: (_timeSec, progress) => progress
      }));

    const [audioTrack] = daw.getTracks();
    const [audioItem] = audioTrack?.items ?? [];
    const audio = audioItem as AudioClip;

    expectAutomationValues(audioTrack?.volume, [0.25, 0.625, 1]);
    expectAutomationValues(audio.gain, [0, 0.5, 1]);

    daw
      .call(trackOps.add("midi"))
      .call(clip.add(midiClip("clip-b")))
      .call(note.add())
      .call(note.pitch({
        curve: "smoothstep",
        durationBeats: 2,
        sampleCount: 3,
        startBeat: 4,
        valueAtBeat: (_beat, progress) => 60 + 12 * progress
      }));

    const [, midiTrack] = daw.getTracks();
    const [midiItem] = midiTrack?.items ?? [];
    const midi = midiItem as MidiClip;

    expectAutomationValues(midi.notes[0]?.pitch, [60, 66, 72]);
  });

  it("normalizes constructor track input with midi note aliases", () => {
    const daw = createDAW({
      track: {
        items: [
          {
            MidiNote: [
              {
                durationInBeats: 2,
                pitch: 10,
                position: {
                  bar: 3,
                  beat: 3,
                  subBeat: 3 / 4
                },
                velocity: 120
              }
            ],
            position: {
              bar: 16,
              beat: 3,
              subBeat: 3 / 4
            }
          }
        ]
      }
    });

    const [track] = daw.getTracks();
    const [clip] = track?.items ?? [];
    const midi = clip as MidiClip;

    expect(track?.kind).toBe("midi");
    expect(midi.type).toBe("midi-clip");
    expect(midi.notes[0]?.pitch).toBe(10);
    expect(midi.notes[0]?.durationInBeats).toBe(2);
  });

  it("normalizes track blocks", () => {
    const daw = createDAW({
      tracks: [
        {
          Block: [
            {
              endBeat: 8,
              loop: true,
              notes: [
                {
                  durationInBeats: 2,
                  pitch: 64
                }
              ],
              startBeat: 4,
              title: "Hook"
            }
          ],
          kind: "midi"
        },
        {
          Block: [
            {
              audioFile: {
                fileName: "loop.wav",
                sourceId: "source-loop",
                uri: "/audio/loop.wav"
              },
              endBeat: 12,
              loop: false,
              sourceEndSec: 3,
              sourceStartSec: 1,
              startBeat: 0,
              title: "Drum Loop"
            }
          ],
          kind: "audio"
        }
      ]
    });

    const [midiTrack, audioTrack] = daw.getTracks();

    expect(midiTrack?.Block[0]).toMatchObject({
      endBeat: 8,
      loop: true,
      startBeat: 4,
      title: "Hook",
      type: "midi-block"
    });
    expect(midiTrack?.Block[0]?.type === "midi-block" ? midiTrack.Block[0].notes[0]?.pitch : undefined).toBe(64);
    expect(audioTrack?.Block[0]).toMatchObject({
      audioFile: {
        fileName: "loop.wav",
        sourceId: "source-loop",
        uri: "/audio/loop.wav"
      },
      endBeat: 12,
      loop: false,
      sourceEndSec: 3,
      sourceStartSec: 1,
      startBeat: 0,
      title: "Drum Loop",
      type: "audio-block"
    });
  });
});

function expectAutomationValues(
  value: AudioClip["gain"],
  expected: readonly number[]
): void {
  if (typeof value === "number" || value === undefined) {
    throw new Error("Expected automated value.");
  }

  const rendered = renderAudioAutomationCurve(value as AudioParamAutomation);

  expect(Array.from(rendered.values)).toEqual(expected);
}
