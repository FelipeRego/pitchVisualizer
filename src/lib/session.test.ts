import { describe, expect, it } from "vitest";
import type { PitchFrame } from "../types";
import { frequencyToPitchFrame } from "./notes";
import { buildHistogram, isAcceptedFrame, summarizeSession } from "./session";

function frame(frequencyHz: number, timestamp: number): PitchFrame {
  return frequencyToPitchFrame(frequencyHz, 0.95, timestamp);
}

describe("frame filtering", () => {
  it("accepts clear frames in the practical musical range", () => {
    expect(isAcceptedFrame(220, 0.9)).toBe(true);
  });

  it("rejects low clarity and out-of-range frames", () => {
    expect(isAcceptedFrame(220, 0.2)).toBe(false);
    expect(isAcceptedFrame(40, 0.95)).toBe(false);
    expect(isAcceptedFrame(2000, 0.95)).toBe(false);
  });
});

describe("histogram aggregation", () => {
  it("groups counts by note name across octaves", () => {
    const histogram = buildHistogram([frame(261.625565, 1), frame(523.25113, 2), frame(440, 3)]);

    expect(histogram.find((bin) => bin.noteName === "C")).toMatchObject({
      count: 2,
      percentage: 100 * (2 / 3)
    });
    expect(histogram.find((bin) => bin.noteName === "A")).toMatchObject({
      count: 1,
      percentage: 100 * (1 / 3)
    });
  });
});

describe("session summary", () => {
  it("returns empty summary defaults when there are no accepted frames", () => {
    expect(summarizeSession([], 100, 1100, null)).toEqual({
      durationMs: 1000,
      acceptedFrames: 0,
      dominantNote: null,
      averageFrequencyHz: null,
      averageCents: null,
      inTunePercent: null
    });
  });

  it("calculates dominant note, averages, and nearest-note in-tune percentage", () => {
    const frames = [frame(440, 1), frame(440 * 2 ** (5 / 1200), 2), frame(261.625565, 3)];
    const summary = summarizeSession(frames, 0, 3000, null);

    expect(summary.durationMs).toBe(3000);
    expect(summary.acceptedFrames).toBe(3);
    expect(summary.dominantNote).toBe("A");
    expect(summary.averageFrequencyHz).toBeCloseTo((440 + 441.27 + 261.63) / 3, 1);
    expect(summary.averageCents).toBeCloseTo(5 / 3, 1);
    expect(summary.inTunePercent).toBe(100);
  });

  it("calculates target-note tuning percentage against a selected target", () => {
    const frames = [frame(440, 1), frame(466.1637615, 2)];
    const summary = summarizeSession(frames, 0, 1000, { noteName: "A", octave: 4 });

    expect(summary.inTunePercent).toBe(50);
    expect(summary.averageCents).toBeCloseTo(50, 0);
  });
});
