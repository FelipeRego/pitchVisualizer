# Pitch Visualizer

[Open the live prototype](https://pitch-visualizer.feliperego.chatgpt.site)

A browser-only React app for live pitch practice. It listens to your microphone,
detects monophonic pitch in real time, shows the current note and frequency, and
builds a histogram of the most common notes you sing or play.

## What It Does

- Detects live pitch from the microphone using the Web Audio API and `pitchy`.
- Shows the current note, octave, frequency, cents offset, and confidence.
- Tracks the 12 pitch classes in a live histogram: `C` through `B`.
- Supports two practice modes:
  - `Explore Notes`: hum, sing, or play freely and see which notes appear most often.
  - `Target Practice`: choose a target note and octave, then watch whether you are sharp, flat, or in tune.
- Summarizes each session with duration, top note, average frequency, average cents, and in-tune percentage.
- Runs locally in the browser. Audio is not uploaded to a server.

## V1 Scope

This version is designed for one clear pitch at a time: voice, humming, or a
single-note instrument line.

It does not currently support:

- Chord recognition
- Uploaded audio files
- Full song transcription
- Separating vocals from background music
- Reliable mixed-audio analysis

Those features would need a model-backed transcription workflow or backend
processing in a future version.

## How Pitch Detection Works

The app analyzes microphone audio in short time-domain frames. Accepted frames
must pass a clarity threshold and stay within a practical musical range. Each
accepted frequency is converted to the nearest chromatic note using `A4 = 440 Hz`.

Defaults:

- Frequency range: `60 Hz` to `1400 Hz`
- Minimum clarity: `0.78`
- In-tune threshold: `+/-10 cents`
- Reference tuning: `A4 = 440 Hz`

## Requirements

- Node.js
- npm
- A modern browser with microphone support
- Microphone access granted in the browser

Microphone APIs generally require a secure context. Local development on
`localhost` is supported by browsers.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal, then allow microphone access when the
browser prompts you.

## Scripts

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Using The App

1. Choose `Explore Notes` to sing or play freely.
2. Press `Start` and allow microphone access.
3. Watch the current note and histogram update as you produce notes.
4. Switch to `Target Practice` to select a note and octave.
5. Use the cents readout to adjust pitch:
   - Negative cents means flat.
   - Positive cents means sharp.
   - Near zero means centered on the target.

Info buttons beside metrics explain what each value means.

## Tech Stack

- Vite
- React
- TypeScript
- Web Audio API
- `pitchy`
- Vitest

## Privacy

Pitch detection happens in the browser using the live microphone stream. The app
does not send recorded audio to a backend.
