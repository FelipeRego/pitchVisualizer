import { Activity, Mic, RotateCcw, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { NoteName, PitchFrame, TargetNote, TuningMode } from "./types";
import {
  A4_FREQUENCY,
  NOTE_NAMES,
  centsForTarget,
  formatCents,
  midiToFrequency,
  noteToMidi
} from "./lib/notes";
import { analyzePitchFrames, IN_TUNE_CENTS } from "./lib/session";
import { type MicState, usePitchDetection } from "./hooks/usePitchDetection";

const TARGET_OCTAVES = [2, 3, 4, 5, 6];

export function App() {
  const [tuningMode, setTuningMode] = useState<TuningMode>("nearest");
  const [target, setTarget] = useState<TargetNote>({ noteName: "A", octave: 4 });
  const { micState, currentFrame, frames, errorMessage, start, stop, reset, startedAt } =
    usePitchDetection();
  const [clock, setClock] = useState(() => performance.now());
  const isListening = micState === "listening";
  const isRequesting = micState === "requesting";

  useEffect(() => {
    if (!isListening) {
      return;
    }

    const timer = window.setInterval(() => setClock(performance.now()), 500);
    return () => window.clearInterval(timer);
  }, [isListening]);

  const activeTarget = tuningMode === "target" ? target : null;
  const analysis = useMemo(() => analyzePitchFrames(frames, activeTarget), [activeTarget, frames]);
  const histogram = analysis.histogram;
  const summary = {
    durationMs: startedAt == null ? 0 : Math.max(0, clock - startedAt),
    ...analysis.summary
  };
  const tuningCents = getTuningCents(currentFrame, tuningMode, target);
  const inTune = tuningCents != null && Math.abs(tuningCents) <= IN_TUNE_CENTS;
  const targetFrequency = midiToFrequency(noteToMidi(target));

  return (
    <main className="app-shell">
      <section className="hero-strip" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Live monophonic pitch practice</p>
          <h1 id="app-title">Pitch Visualizer</h1>
        </div>
        <div className={`status-pill status-${micState}`}>
          <span aria-hidden="true" />
          {statusLabel(micState)}
        </div>
      </section>

      <section className="workspace" aria-label="Live pitch analysis">
        <section className="histogram-panel" aria-labelledby="histogram-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Most common notes</p>
              <h2 id="histogram-title">Pitch-class histogram</h2>
            </div>
            <span className="frame-count">{summary.acceptedFrames} frames</span>
          </div>
          <div className="histogram" role="list" aria-label="Detected note distribution">
            {histogram.map((bin) => (
              <div className="histogram-row" role="listitem" key={bin.noteName}>
                <span className="note-label">{bin.noteName}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(bin.percentage, bin.count > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <span className="bar-value">{formatPercentValue(bin.percentage)}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="side-stack" aria-label="Live controls and summary">
          <section className="readout-card" aria-label="Current pitch">
            <div className="current-note">
              <span>{currentFrame ? currentFrame.noteName : "--"}</span>
              <small>{currentFrame ? currentFrame.octave : ""}</small>
            </div>
            <div className={`tune-badge ${inTune ? "in-tune" : "out-tune"}`}>
              {currentFrame ? `${formatCents(tuningCents)} cents` : "Waiting for pitch"}
            </div>
            <dl className="metric-grid">
              <Metric label="Frequency" value={formatHz(currentFrame?.frequencyHz)} />
              <Metric label="Confidence" value={formatPercent(currentFrame?.clarity)} />
              <Metric label="A4 reference" value={formatHz(A4_FREQUENCY)} />
              <Metric label="Mode" value={tuningMode === "nearest" ? "Nearest" : "Target"} />
            </dl>
          </section>

          <section className="control-card" aria-label="Session controls">
            <div className="button-row">
              <button
                className="primary-button"
                type="button"
                onClick={async () => {
                  await start();
                  setClock(performance.now());
                }}
                disabled={isListening || isRequesting}
              >
                <Mic size={18} aria-hidden="true" />
                {isRequesting ? "Requesting" : isListening ? "Listening" : "Start"}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  setClock(performance.now());
                  stop();
                }}
                disabled={!isListening}
                aria-label="Stop listening"
                title="Stop listening"
              >
                <Square size={18} aria-hidden="true" />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  reset();
                  setClock(performance.now());
                }}
                aria-label="Reset session"
                title="Reset session"
              >
                <RotateCcw size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="segmented" role="group" aria-label="Tuning mode">
              <button
                type="button"
                className={tuningMode === "nearest" ? "selected" : ""}
                onClick={() => setTuningMode("nearest")}
              >
                Nearest note
              </button>
              <button
                type="button"
                className={tuningMode === "target" ? "selected" : ""}
                onClick={() => setTuningMode("target")}
              >
                Target note
              </button>
            </div>

            <div className="target-grid" aria-disabled={tuningMode !== "target"}>
              <label>
                Target note
                <select
                  value={target.noteName}
                  disabled={tuningMode !== "target"}
                  onChange={(event) =>
                    setTarget((current) => ({
                      ...current,
                      noteName: event.target.value as NoteName
                    }))
                  }
                >
                  {NOTE_NAMES.map((noteName) => (
                    <option key={noteName} value={noteName}>
                      {noteName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Octave
                <select
                  value={target.octave}
                  disabled={tuningMode !== "target"}
                  onChange={(event) =>
                    setTarget((current) => ({
                      ...current,
                      octave: Number(event.target.value)
                    }))
                  }
                >
                  {TARGET_OCTAVES.map((octave) => (
                    <option key={octave} value={octave}>
                      {octave}
                    </option>
                  ))}
                </select>
              </label>
              <p>{target.noteName}{target.octave} = {formatHz(targetFrequency)}</p>
            </div>

            {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
          </section>

          <section className="summary-card" aria-labelledby="summary-title">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Session</p>
                <h2 id="summary-title">Summary stats</h2>
              </div>
              <Activity size={20} aria-hidden="true" />
            </div>
            <dl className="summary-list">
              <Metric label="Duration" value={formatDuration(summary.durationMs)} />
              <Metric label="Dominant note" value={summary.dominantNote ?? "--"} />
              <Metric label="Average Hz" value={formatHz(summary.averageFrequencyHz)} />
              <Metric label="Average cents" value={formatCents(summary.averageCents)} />
              <Metric label="In tune" value={formatPercentValue(summary.inTunePercent)} />
            </dl>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const MIC_STATUS_LABELS: Record<MicState, string> = {
  idle: "Idle",
  requesting: "Requesting mic",
  listening: "Listening",
  paused: "Stopped",
  denied: "Mic denied",
  unsupported: "Unsupported",
  error: "Error"
};

function statusLabel(state: MicState): string {
  return MIC_STATUS_LABELS[state];
}

function getTuningCents(
  frame: PitchFrame | null,
  tuningMode: TuningMode,
  target: TargetNote
): number | null {
  if (frame == null) {
    return null;
  }

  return tuningMode === "target" ? centsForTarget(frame.frequencyHz, target) : frame.cents;
}

function formatHz(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "--" : `${value.toFixed(1)} Hz`;
}

function formatPercent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "--" : `${Math.round(value * 100)}%`;
}

function formatPercentValue(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "--" : `${Math.round(value)}%`;
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
