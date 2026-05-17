export * from "./daw";
export * from "./types";
export * from "./timeline";
export * from "./track";

export const DEFAULT_SAMPLE_RATE = 44_100;

export function secondsToSamples(
  seconds: number,
  sampleRate = DEFAULT_SAMPLE_RATE
): number {
  assertFiniteNonNegative(seconds, "seconds");
  assertPositive(sampleRate, "sampleRate");

  return Math.round(seconds * sampleRate);
}

export function samplesToSeconds(
  samples: number,
  sampleRate = DEFAULT_SAMPLE_RATE
): number {
  assertFiniteNonNegative(samples, "samples");
  assertPositive(sampleRate, "sampleRate");

  return samples / sampleRate;
}

export function beatsToSeconds(beats: number, bpm: number): number {
  assertFiniteNonNegative(beats, "beats");
  assertPositive(bpm, "bpm");

  return (beats * 60) / bpm;
}

export function secondsToBeats(seconds: number, bpm: number): number {
  assertFiniteNonNegative(seconds, "seconds");
  assertPositive(bpm, "bpm");

  return (seconds * bpm) / 60;
}

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number greater than or equal to 0.`);
  }
}

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than 0.`);
  }
}
