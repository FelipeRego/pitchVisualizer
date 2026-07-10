import type { NoteName, PitchFrame, TargetNote } from "../types";

export const A4_FREQUENCY = 440;
const A4_MIDI = 69;
export const NOTE_NAMES: NoteName[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
];

export function frequencyToMidi(frequencyHz: number): number {
  return Math.round(12 * Math.log2(frequencyHz / A4_FREQUENCY) + A4_MIDI);
}

export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / 12);
}

export function midiToNote(midi: number): Pick<PitchFrame, "noteName" | "octave" | "midi"> {
  const noteIndex = ((midi % 12) + 12) % 12;
  return {
    noteName: NOTE_NAMES[noteIndex],
    octave: Math.floor(midi / 12) - 1,
    midi
  };
}

export function frequencyToPitchFrame(
  frequencyHz: number,
  clarity: number,
  timestamp: number
): PitchFrame {
  const midi = frequencyToMidi(frequencyHz);
  const nearestFrequency = midiToFrequency(midi);
  const cents = centsBetween(frequencyHz, nearestFrequency);
  return {
    frequencyHz,
    clarity,
    ...midiToNote(midi),
    cents,
    timestamp
  };
}

export function noteToMidi(target: TargetNote): number {
  return (target.octave + 1) * 12 + NOTE_NAMES.indexOf(target.noteName);
}

export function centsBetween(frequencyHz: number, referenceFrequencyHz: number): number {
  return 1200 * Math.log2(frequencyHz / referenceFrequencyHz);
}

export function centsForTarget(frequencyHz: number, target: TargetNote): number {
  return centsBetween(frequencyHz, midiToFrequency(noteToMidi(target)));
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) {
    return "--";
  }

  const rounded = Math.round(cents);
  if (rounded === 0) {
    return "0";
  }

  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}
