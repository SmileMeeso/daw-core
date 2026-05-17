import type { Track } from "../types";

export function sortTracksByOrder<T extends Pick<Track, "order">>(
  tracks: readonly T[]
): T[] {
  return [...tracks].sort((a, b) => a.order - b.order);
}

export function findTrackById<T extends Pick<Track, "id">>(
  tracks: readonly T[],
  id: string
): T | undefined {
  return tracks.find((track) => track.id === id);
}
