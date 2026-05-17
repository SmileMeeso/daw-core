export type TransposeEffect = {
  type: "transpose";
  semitones: number;
};

export type QuantizeEffect = {
  type: "quantize";
  grid: number;
};

export type VelocityCompressEffect = {
  type: "velocity-compress";
  amount: number;
};

export type NoteRangeFilterEffect = {
  type: "note-range-filter";
  minPitch: number;
  maxPitch: number;
};

export type MidiEffect =
  | TransposeEffect
  | QuantizeEffect
  | VelocityCompressEffect
  | NoteRangeFilterEffect;
