export type NoteName =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";

export type TuningMode = "nearest" | "target";

export interface PitchFrame {
  frequencyHz: number;
  clarity: number;
  noteName: NoteName;
  octave: number;
  midi: number;
  cents: number;
  timestamp: number;
}

export interface HistogramBin {
  noteName: NoteName;
  count: number;
  percentage: number;
}

export interface SessionSummary {
  durationMs: number;
  acceptedFrames: number;
  dominantNote: NoteName | null;
  averageFrequencyHz: number | null;
  averageCents: number | null;
  inTunePercent: number | null;
}

export interface TargetNote {
  noteName: NoteName;
  octave: number;
}
