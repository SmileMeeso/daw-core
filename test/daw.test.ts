import { describe, expect, it } from "vitest";

import { DAW } from "../src";
import type { AudioClip, AudioEffect, MidiClip } from "../src";

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
      .addTrack("audio")
      .addClip(audioClip("clip-a"))
      .addClip(audioClip("clip-b"))
      .setEffect(50);

    const clipId = daw.getId();

    daw.update(clipId, { gain: 0.5 }).remove(clipId);

    const [track] = daw.getTracks();

    expect(track?.items).toHaveLength(1);
    expect(track?.items[0]?.id).toBe("clip-a");
  });

  it("chains midi clip and note edits", () => {
    const daw = new DAW();

    daw
      .addTrack("midi")
      .addClip(midiClip("clip-a"))
      .addNode()
      .setPitch(100)
      .addClip(midiClip("clip-b"));

    const [track] = daw.getTracks();
    const firstClip = track?.items[0] as MidiClip;

    expect(track?.items).toHaveLength(2);
    expect(firstClip.notes).toHaveLength(1);
    expect(firstClip.notes[0]?.pitch).toBe(100);
  });

  it("chains master track volume and effects", () => {
    const eq: AudioEffect = {
      frequency: 1_000,
      filterType: "lowpass",
      type: "filter"
    };
    const compressor: AudioEffect = {
      ratio: 4,
      threshold: -18,
      type: "compressor"
    };

    const daw = new DAW();

    daw.addTrack("master").setVolume(50).setEffect(eq).setEffect(compressor);

    const [track] = daw.getTracks();

    expect(track?.volume).toBe(50);
    expect(track?.audioEffects).toEqual([eq, compressor]);
  });

  it("normalizes constructor track input with midi note aliases", () => {
    const daw = new DAW({
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
});
