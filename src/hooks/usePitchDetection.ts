import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import type { PitchFrame } from "../types";
import { frequencyToPitchFrame } from "../lib/notes";
import { isAcceptedFrame } from "../lib/session";

export type MicState =
  | "idle"
  | "requesting"
  | "listening"
  | "paused"
  | "denied"
  | "unsupported"
  | "error";

interface UsePitchDetectionResult {
  micState: MicState;
  currentFrame: PitchFrame | null;
  frames: PitchFrame[];
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  startedAt: number | null;
}

const BUFFER_SIZE = 4096;
const FRAME_INTERVAL_MS = 45;
const MAX_FRAMES = 6000;

export function usePitchDetection(): UsePitchDetectionResult {
  const [micState, setMicState] = useState<MicState>("idle");
  const [frames, setFrames] = useState<PitchFrame[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Float32Array<ArrayBuffer>>(
    new Float32Array(BUFFER_SIZE) as Float32Array<ArrayBuffer>
  );
  const lastFrameAtRef = useRef(0);
  const smoothedFrequencyRef = useRef<number | null>(null);
  const detector = useMemo(() => PitchDetector.forFloat32Array(BUFFER_SIZE), []);

  const stopAnimation = useCallback(() => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setFrames([]);
    setStartedAt((current) => (current == null ? current : performance.now()));
    smoothedFrequencyRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stopAnimation();
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();

    sourceRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    smoothedFrequencyRef.current = null;
    setMicState((current) => (current === "idle" ? "idle" : "paused"));
  }, [stopAnimation]);

  const analyze = useCallback(() => {
    const analyser = analyserRef.current;
    const audioContext = audioContextRef.current;

    if (!analyser || !audioContext) {
      return;
    }

    const now = performance.now();
    if (now - lastFrameAtRef.current >= FRAME_INTERVAL_MS) {
      lastFrameAtRef.current = now;
      analyser.getFloatTimeDomainData(dataRef.current);
      const [detectedFrequency, clarity] = detector.findPitch(
        dataRef.current,
        audioContext.sampleRate
      );

      if (isAcceptedFrame(detectedFrequency, clarity)) {
        const previous = smoothedFrequencyRef.current;
        const frequencyHz =
          previous == null ? detectedFrequency : previous * 0.35 + detectedFrequency * 0.65;
        smoothedFrequencyRef.current = frequencyHz;
        const frame = frequencyToPitchFrame(frequencyHz, clarity, Date.now());

        setFrames((current) => {
          const next = current.length >= MAX_FRAMES ? current.slice(1) : current.slice();
          next.push(frame);
          return next;
        });
      }
    }

    rafRef.current = window.requestAnimationFrame(analyze);
  }, [detector]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setMicState("unsupported");
      setErrorMessage("This browser does not support live microphone pitch detection.");
      return;
    }

    setMicState("requesting");
    setErrorMessage(null);

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      analyser.smoothingTimeConstant = 0;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      lastFrameAtRef.current = 0;
      smoothedFrequencyRef.current = null;
      setStartedAt(performance.now());
      setFrames([]);
      setMicState("listening");
      rafRef.current = window.requestAnimationFrame(analyze);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
      const isDenied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      setMicState(isDenied ? "denied" : "error");
      setErrorMessage(
        isDenied
          ? "Microphone access was denied. Allow mic access to analyze live pitch."
          : "Could not start microphone analysis."
      );
    }
  }, [analyze]);

  useEffect(() => stop, [stop]);

  return {
    micState,
    currentFrame: frames.length > 0 ? frames[frames.length - 1] : null,
    frames,
    errorMessage,
    start,
    stop,
    reset,
    startedAt
  };
}
