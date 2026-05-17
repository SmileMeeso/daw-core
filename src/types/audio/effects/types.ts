export interface FilterAudioEffect {
  type: "filter";
  filterType: "lowpass" | "highpass";
  frequency: number;
  qFactor?: number;
}

export interface CompressorAudioEffect {
  type: "compressor";
  threshold: number;
  ratio: number;
  attack?: number;
  release?: number;
}

export type AudioEffect = FilterAudioEffect | CompressorAudioEffect;
