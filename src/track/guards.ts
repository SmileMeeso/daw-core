import type { Track, TrackKind } from "../types";

const trackKinds: readonly TrackKind[] = ["midi", "audio", "hybrid", "bus", "master"];

export function isTrackKind(value: unknown): value is TrackKind {
  return typeof value === "string" && trackKinds.includes(value as TrackKind);
}

export function isTrack(value: unknown): value is Track {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<Track>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    isTrackKind(candidate.kind) &&
    typeof candidate.order === "number" &&
    typeof candidate.muted === "boolean" &&
    typeof candidate.solo === "boolean" &&
    typeof candidate.volume === "number" &&
    typeof candidate.pan === "number" &&
    Array.isArray(candidate.items)
  );
}
