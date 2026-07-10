import { describe, expect, it } from "vitest";
import {
  centsBetween,
  frequencyToMidi,
  frequencyToPitchFrame,
  midiToFrequency,
  midiToNote,
  noteToMidi
} from "./notes";

describe("note conversion", () => {
  it("maps A4 at 440Hz to midi 69 with zero cents", () => {
    const frame = frequencyToPitchFrame(440, 0.99, 1000);

    expect(frame.midi).toBe(69);
    expect(frame.noteName).toBe("A");
    expect(frame.octave).toBe(4);
    expect(frame.cents).toBeCloseTo(0, 5);
  });

  it("maps octave boundaries correctly", () => {
    expect(midiToNote(60)).toEqual({ midi: 60, noteName: "C", octave: 4 });
    expect(midiToNote(71)).toEqual({ midi: 71, noteName: "B", octave: 4 });
    expect(midiToNote(72)).toEqual({ midi: 72, noteName: "C", octave: 5 });
  });

  it("rounds frequencies to the nearest chromatic midi note", () => {
    expect(frequencyToMidi(261.625565)).toBe(60);
    expect(frequencyToMidi(277.182631)).toBe(61);
  });

  it("calculates cents offset around a reference", () => {
    const sharpFrequency = midiToFrequency(69) * 2 ** (25 / 1200);

    expect(centsBetween(sharpFrequency, 440)).toBeCloseTo(25, 5);
  });

  it("converts target note selections to midi", () => {
    expect(noteToMidi({ noteName: "C", octave: 4 })).toBe(60);
    expect(noteToMidi({ noteName: "A", octave: 4 })).toBe(69);
  });
});
