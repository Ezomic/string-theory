# String Theory

A music-learning PWA that teaches music theory, guitar, and bass — read it, see it
on the fretboard, hear it, then play it while the app listens via the microphone.

Full product context lives in [`docs/`](docs/): `music-learning-app-plan.md` (why),
`string-theory-build-spec.md` (how — the primary technical reference),
`string-theory-screens.html` (the exact visual mockup of all 36 screens — open
it in a browser to see the intended layout), and `BUILD-PROMPT.md` (the build
brief and milestone plan).

## Stack

React + TypeScript + Vite, installable as a PWA. Zustand for state, Web Audio
API for pitch detection and playback, IndexedDB (via `idb`) for local-first
persistence, React Router, Vitest for tests.

## Running it

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm test          # run the test suite once
npm run test:watch
```

## What's built

### Milestone 0 — Foundations ✅

- **Design tokens** (`src/styles/tokens.css`) — the exact color/radius tokens
  from the visual mockup (`docs/string-theory-screens.html`), including the
  soft/border color variants used for pills, cards, and chips.
- **Shared component library** (`src/components/ui/`) — Card, Pill, Button,
  Segmented, Toggle, RadioOption, StatTile, AppBar, BottomNav, ProgressBar,
  SectionLabel, NoteChip, TunerMeter, PlayButton, Heatmap.
- **`pitchEngine`** (`src/lib/pitch/`) — mic capture via `getUserMedia` +
  `AudioContext`/`AnalyserNode`, autocorrelation-based pitch detection
  (`autocorrelate.ts`), and the note-math correctness core (`noteMath.ts`:
  `hzToNote`, `noteToHz`, `centsBetween`), all unit-tested including the
  guitar low-E and 5-string-bass low-B extremes.
- **`Fretboard`** (`src/components/Fretboard/`) — one data-driven SVG
  component handling 4/5/6 strings, left-handed mirroring, fret inlays, and
  role-colored markers (root/scale/chord/interval/correct/ghost).
- **IndexedDB data layer** (`src/lib/db/`) — typed schema + CRUD helpers for
  every entity in the spec's data model (profile, instrument configs,
  placement results, curriculum, progress, drills, settings, etc.).
- **Debug page** (`src/pages/FoundationsDebugPage.tsx`, served at `/debug`) —
  live mic pitch readout via `pitchEngine`, and an interactive `Fretboard`
  demo (instrument toggle, label mode, left-handed, tap-to-log).

### Milestone 1 — Tuner + mic flows ✅

- **`MicGate`** (`src/components/mic/`) — a reusable wrapper implementing the
  spec's A4 (pre-permission explainer) → A5 (denied fallback, never a
  dead-end) → granted flow. Every mic-dependent screen composes this instead
  of talking to `pitchEngine` directly.
- **Tuner** (`src/pages/tuner/TunerPage.tsx`, F1/F2) — live chromatic tuner
  for guitar and bass: big note readout, `TunerMeter` needle + cents, tappable
  string targets (auto-detect or locked), tuning label, in-tune/flat/sharp
  states, and a "play a note" no-signal state.
- **Alt tunings picker** (`src/pages/tuner/TuningPickerPage.tsx`, F3) —
  presets (Standard, Drop D, Half-step down, DADGAD, Open G for guitar;
  Standard/5-string/Drop D for bass) plus a validated custom tuning builder.
- **`instrumentStore`** (`src/store/instrumentStore.ts`) — Zustand store
  holding both instruments' configs, write-through persisted to IndexedDB
  and hydrated on app load; verified to survive a full page reload.
- **App shell & routing** (`src/App.tsx`, `src/components/TabsLayout.tsx`) —
  real `BottomNav`-backed routes for Home/Path/Tools/Progress. Home/Path/
  Progress are placeholder screens until their milestones land; Tools hosts
  the toolbox grid with the Tuner wired up and the rest marked "Soon."

**Implementation notes:**
- Browsers can't be deep-linked to OS mic settings from a web page, so A5's
  "Open settings to enable" became "Try enabling again" (re-invokes
  `getUserMedia`) — most browsers won't re-prompt after an explicit denial,
  but this avoids a dead button.
- Each screen currently owns its own `PitchEngine` instance (created in
  `usePitchEngine`), so permission state doesn't persist across navigation
  within the app — revisiting the Tuner re-shows A4 even after a prior grant
  in the same session. Worth hoisting to a shared instance if this becomes
  annoying once more mic screens exist (Milestone 5).
- **Not yet verified:** live pitch detection and the tuner's needle/string
  targeting against a real microphone and real guitar/bass — same sandbox
  limitation as Milestone 0. Please confirm on a real device before Milestone 2.

### Milestone 2 — Fretboard Explorer ✅

- **`theory.ts`** (`src/lib/theory.ts`) — the scale/chord catalog (major,
  natural minor, major/minor pentatonic; major, minor, 7, maj7, m7) and pure
  functions computing fretboard positions from a root + formula
  (`notesForFormula`, `fretboardMarkersForNotes`, `fretboardPositionsForNote`,
  `intervalLabel`), all unit-tested. `noteMath.ts` gained `transposeNote`,
  the semitone-transposition primitive everything else is built on.
- **Fretboard Explorer** (`src/pages/fretboard/FretboardExplorerPage.tsx`,
  G1/G2 unified via a "Show" tab) — scale view and chord view over one
  `Fretboard`, with root/type pickers, guitar/bass4/bass5 instrument
  variants, prev/next root cycling in chord mode, and an "Interval" mode
  that relabels markers as scale degrees (R, 3, ♭7, ...) instead of note
  names.
- **Note-finding quiz** (`src/pages/fretboard/QuizPage.tsx`, G3) — "tap
  every {note}" drill with a live timer, score/streak, a "Show answers"
  ghost-marker hint, and round completions that write a `DrillResult` and
  bump `SkillProgress('fretboardNotes')` in IndexedDB.

**Bugs found and fixed while verifying in-browser (worth knowing about):**
- `Fretboard`'s marker circles didn't have `pointer-events: none`, so on
  quiz screens they silently intercepted taps meant for the invisible
  tap-target cell underneath — you could never successfully tap a cell that
  already had a marker on it (which, in the quiz, is every remaining answer
  once "Show answers" is on). Fixed in `Fretboard.module.css`.
- `QuizPage`'s tap handler read `found` directly from the render closure
  instead of using the functional `setFound(prev => ...)` form. Taps
  processed in the same React batch (reproducible by dispatching several
  clicks synchronously, though unlikely from normal single-finger tapping)
  would silently overwrite each other instead of accumulating. Moved the
  "round complete" check into a `useEffect` keyed on `found`.
- Mobile WebKit's default `-webkit-tap-highlight-color` was leaving a blue
  highlight box after tapping fretboard cells and buttons. Disabled
  globally in `base.css` — standard practice for an app that's meant to
  feel native, not like a tapped web page.

**Not yet verified:** none of Milestone 2 depends on the microphone, so
everything here — scale/chord rendering, root/type switching, and the full
quiz interaction loop — was verified directly in-browser this time.

### Milestone 3 — Ear Training ✅

- **`playbackEngine.ts`** (`src/lib/audio/`) — a small Web Audio
  oscillator-based player (no Tone.js/sample library needed), playing
  frequencies either together ("harmonic", for chords) or in sequence
  ("melodic", for intervals/scales) with a click-free linear gain envelope.
- **`earTraining.ts`** (`src/lib/`) — question generation for three drill
  categories (intervals, chord quality, major-vs-minor scale recognition),
  each with a difficulty-scaled candidate pool, a pedagogical hint per
  answer for the wrong-answer teach state, and `statsForCategory` /
  `levelFromCorrectCount` for deriving level + accuracy from stored
  `DrillResult`s. All unit-tested, including invariants like "the correct
  answer is always among the choices" and "no duplicate choices."
- **Drill picker** (`src/pages/ear/EarTrainingPickerPage.tsx`, H1) — per
  category level/accuracy (from IndexedDB) with a progress bar once
  there's data, and "Chord progressions" locked until Intervals reaches
  level 4.
- **Drill screen** (`src/pages/ear/DrillPage.tsx`, H2 active / H3
  wrong-answer teach — one screen, two states) — play button, replay,
  a harmonic/melodic toggle (intervals only), a 2–4 option answer grid,
  streak-based adaptive difficulty, and on a wrong answer: the correct
  answer highlighted, a "Listen again" hint card, and an explicit
  "Got it — next" continue (never just marks wrong and moves on).

**Note on layout:** unlike the Tuner's alt-tunings picker or the Fretboard
quiz, the mockup keeps `BottomNav` visible on both H2 and H3 — so the drill
screens live inside `TabsLayout`, not as standalone routes.

**Not yet verified:** whether the generated intervals/chords/scales
actually *sound* musically correct and in tune when played through real
speakers — the oscillator math is straightforward (equal temperament,
same `2^(n/12)` relationship the tuner already relies on) but I have no
way to listen to it from this sandbox. Worth a quick listen on a real
device before trusting the audio content.
