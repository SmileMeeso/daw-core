import { describe, expect, it } from "vitest";

import {
  beatsToSeconds,
  secondsToBeats,
  secondsToSamples,
  samplesToSeconds
} from "../src/index";

describe("audio timing helpers", () => {
  it("converts seconds to samples", () => {
    expect(secondsToSamples(1.5, 48_000)).toBe(72_000);
  });

  it("converts samples to seconds", () => {
    expect(samplesToSeconds(96_000, 48_000)).toBe(2);
  });

  it("converts beats and seconds at a bpm", () => {
    expect(beatsToSeconds(4, 120)).toBe(2);
    expect(secondsToBeats(2, 120)).toBe(4);
  });
});
