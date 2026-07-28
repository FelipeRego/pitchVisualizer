import Activity from "lucide-react/dist/esm/icons/activity.js";
import Info from "lucide-react/dist/esm/icons/info.js";
import Mic from "lucide-react/dist/esm/icons/mic.js";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw.js";
import Square from "lucide-react/dist/esm/icons/square.js";
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

const MODE_COPY: Record<TuningMode, { eyebrow: string; title: string; description: string }> = {
  nearest: {
    eyebrow: "Explore Notes",
    title: "Sing or play freely",
    description: "See which notes appear most often while you hum, sing, or play one clear note at a time."
  },
  target: {
    eyebrow: "Target Practice",
    title: "Tune against a chosen note",
    description: "Pick a target and watch the cents readout to stay close to the pitch."
  }
};

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
  const modeCopy = MODE_COPY[tuningMode];

  return (
    <main className="app-shell">
      <header className="app-header" aria-labelledby="app-title">
        <div className="brand-block">
          <p className="eyebrow">Live pitch practice</p>
          <h1 id="app-title">Pitch Visualizer</h1>
        </div>
        <div className="header-actions">
          <div className="mode-tabs" role="tablist" aria-label="Practice mode">
            <button
              type="button"
              role="tab"
              aria-selected={tuningMode === "nearest"}
              className={tuningMode === "nearest" ? "selected" : ""}
              onClick={() => setTuningMode("nearest")}
            >
              Explore Notes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tuningMode === "target"}
              className={tuningMode === "target" ? "selected" : ""}
              onClick={() => setTuningMode("target")}
            >
              Target Practice
            </button>
          </div>
          <div className={`status-pill status-${micState}`}>
            <span aria-hidden="true" />
            {statusLabel(micState)}
          </div>
        </div>
      </header>

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

        <aside className="practice-panel" aria-label="Live controls and summary">
          <section className="readout-card" aria-label="Current pitch">
            <div className="mode-copy">
              <p className="eyebrow">{modeCopy.eyebrow}</p>
              <h2>{modeCopy.title}</h2>
              <p>{modeCopy.description}</p>
            </div>

            <div className="readout-grid">
              <div className="current-note">
                <span>{currentFrame ? currentFrame.noteName : "--"}</span>
                {currentFrame ? <small>{currentFrame.octave}</small> : null}
              </div>
              <div className={`tune-badge ${inTune ? "in-tune" : "out-tune"}`}>
                {currentFrame ? `${formatCents(tuningCents)} cents` : "Waiting for pitch"}
              </div>
            </div>

            <dl className="metric-grid primary-metrics">
              <Metric
                label="Frequency"
                value={formatHz(currentFrame?.frequencyHz)}
                helpText="The pitch the microphone hears right now, measured in cycles per second."
              />
              <Metric
                label="Confidence"
                value={formatPercent(currentFrame?.clarity)}
                helpText="How clean and steady the detected pitch is. Higher means the app trusts the note more."
              />
              <Metric
                label="Cents"
                value={currentFrame ? formatCents(tuningCents) : "--"}
                helpText="How far the sound is from the reference note. Negative is flat, positive is sharp."
              />
              <Metric
                label="A4"
                value={formatHz(A4_FREQUENCY)}
                helpText="The tuning standard used for notes. A4 equals 440 Hz in this version."
              />
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

            {tuningMode === "target" ? (
              <div className="target-grid">
                <label>
                  Target note
                  <select
                    value={target.noteName}
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
            ) : (
              <div className="explore-note">
                <strong>{summary.dominantNote ?? "--"}</strong>
                <span>top note so far</span>
              </div>
            )}

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
              <Metric
                label="Time"
                value={formatDuration(summary.durationMs)}
                helpText="How long the current listening session has been running."
              />
              <Metric
                label="Top note"
                value={summary.dominantNote ?? "--"}
                helpText="The note name that appears most often in the histogram."
              />
              <Metric
                label="Avg Hz"
                value={formatHz(summary.averageFrequencyHz)}
                helpText="The average detected pitch across accepted frames in this session."
              />
              <Metric
                label="Avg cents"
                value={formatCents(summary.averageCents)}
                helpText="Your average distance from the reference note. Near zero means more centered."
              />
              <Metric
                label="In tune"
                value={formatPercentValue(summary.inTunePercent)}
                helpText={`The share of accepted frames within ${IN_TUNE_CENTS} cents of the reference note.`}
              />
            </dl>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  helpText
}: {
  label: string;
  value: string;
  helpText?: string;
}) {
  return (
    <div>
      <dt>
        <span>{label}</span>
        {helpText ? <InfoTip text={helpText} label={`What ${label} means`} /> : null}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function InfoTip({ text, label }: { text: string; label: string }) {
  return (
    <span className="info-tip">
      <button type="button" aria-label={label}>
        <Info size={12} aria-hidden="true" />
      </button>
      <span className="tip-bubble" role="tooltip">
        {text}
      </span>
    </span>
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
