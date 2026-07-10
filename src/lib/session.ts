import type { HistogramBin, NoteName, PitchFrame, SessionSummary, TargetNote } from "../types";
import { centsForTarget, NOTE_NAMES } from "./notes";

const MIN_FREQUENCY_HZ = 60;
const MAX_FREQUENCY_HZ = 1400;
const MIN_CLARITY = 0.78;
export const IN_TUNE_CENTS = 10;

export interface PitchFrameAnalysis {
  histogram: HistogramBin[];
  summary: Omit<SessionSummary, "durationMs">;
}

export function isAcceptedFrame(
  frequencyHz: number,
  clarity: number,
  minClarity = MIN_CLARITY
): boolean {
  return (
    Number.isFinite(frequencyHz) &&
    Number.isFinite(clarity) &&
    frequencyHz >= MIN_FREQUENCY_HZ &&
    frequencyHz <= MAX_FREQUENCY_HZ &&
    clarity >= minClarity
  );
}

export function buildHistogram(frames: PitchFrame[]): HistogramBin[] {
  const counts = new Map<NoteName, number>();
  NOTE_NAMES.forEach((noteName) => counts.set(noteName, 0));

  frames.forEach((frame) => {
    counts.set(frame.noteName, (counts.get(frame.noteName) ?? 0) + 1);
  });

  const total = frames.length;

  return NOTE_NAMES.map((noteName) => {
    const count = counts.get(noteName) ?? 0;
    return {
      noteName,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    };
  });
}

export function summarizeSession(
  frames: PitchFrame[],
  startedAt: number | null,
  now: number,
  target: TargetNote | null,
  inTuneCents = IN_TUNE_CENTS
): SessionSummary {
  const durationMs = startedAt == null ? 0 : Math.max(0, now - startedAt);
  const analysis = analyzePitchFrames(frames, target, inTuneCents);

  return {
    durationMs,
    ...analysis.summary
  };
}

export function analyzePitchFrames(
  frames: PitchFrame[],
  target: TargetNote | null,
  inTuneCents = IN_TUNE_CENTS
): PitchFrameAnalysis {
  if (frames.length === 0) {
    return {
      histogram: buildHistogram([]),
      summary: {
        acceptedFrames: 0,
        dominantNote: null,
        averageFrequencyHz: null,
        averageCents: null,
        inTunePercent: null
      }
    };
  }

  const counts = new Map<NoteName, number>();
  NOTE_NAMES.forEach((noteName) => counts.set(noteName, 0));
  let frequencyTotal = 0;
  let centsTotal = 0;
  let inTuneFrames = 0;

  frames.forEach((frame) => {
    counts.set(frame.noteName, (counts.get(frame.noteName) ?? 0) + 1);
    frequencyTotal += frame.frequencyHz;
    const cents = target ? centsForTarget(frame.frequencyHz, target) : frame.cents;
    centsTotal += cents;
    if (Math.abs(cents) <= inTuneCents) {
      inTuneFrames += 1;
    }
  });

  const histogram = NOTE_NAMES.map((noteName) => {
    const count = counts.get(noteName) ?? 0;
    return {
      noteName,
      count,
      percentage: (count / frames.length) * 100
    };
  });
  const dominantNote = histogram.reduce((current, next) =>
    next.count > current.count ? next : current
  ).noteName;

  return {
    histogram,
    summary: {
      acceptedFrames: frames.length,
      dominantNote,
      averageFrequencyHz: frequencyTotal / frames.length,
      averageCents: centsTotal / frames.length,
      inTunePercent: (inTuneFrames / frames.length) * 100
    }
  };
}
