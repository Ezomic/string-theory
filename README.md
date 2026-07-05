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
npm run dev       # start the dev server (fixed port 5183, see below)
npm run build     # type-check + production build
npm test          # run the test suite once
npm run test:watch
```

### Under Herd

Unlike this repo's PHP/Laravel siblings, this is a plain Vite dev server with
no PHP to hand off to — so instead of `herd link`/`park`, it's wired up as a
Herd **proxy** (the same mechanism Herd uses for Reverb/Docker): Herd's
nginx forwards `https://string-theory.test` to the Vite dev server running
on `localhost:5183`. That means, unlike the other `.test` sites in this
`~/Projects`, **the dev server has to actually be running** for the domain
to respond — Herd isn't managing a persistent process for it the way
PHP-FPM manages Laravel sites.

```bash
cd ~/Projects/string-theory && npm run dev   # keep this running
```

The proxy itself only needs to be created once (already done):

```bash
herd proxy string-theory.test http://localhost:5183 --secure
```

Two things had to be configured in `vite.config.ts` for this to work,
worth knowing if the proxy ever needs recreating:
- `server.port` is pinned to `5183` (not the 5173 default, which was
  already in use by something else) with `strictPort: true`, so the dev
  server never silently drifts to a different port than the proxy targets.
- `server.allowedHosts` includes `string-theory.test` — Vite blocks
  requests with an unrecognized `Host` header by default (DNS-rebinding
  protection), and the nginx proxy forwards the original Host.

HTTPS matters here beyond convenience: service workers (and therefore the
PWA install prompt) only register in a secure context, and `http://` isn't
one for a non-localhost domain — hence `--secure` rather than a plain proxy.

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

### Milestone 4 — Onboarding, Placement & the Path ✅

- **Curriculum as static data** (`src/lib/curriculum.ts`) — 3 units, 5
  lessons (including the flagship "Building the Major Scale" example from
  the mockup), shipped as a TS module rather than seeded into IndexedDB,
  per the spec's explicit allowance for either approach.
- **Onboarding** (`src/pages/onboarding/`) — splash (A1, routes to
  onboarding or straight to Home depending on whether a profile already
  exists), instrument & experience picker (A2), and an account screen (A3)
  that's honest about not having a backend yet: email/password fields and
  "Create account" are visibly present but disabled, only "Continue as
  guest" is functional.
- **Placement check** (`src/pages/onboarding/PlacementPage.tsx`, B1–B4) —
  4 theory + 2 ear questions, reusing the ear-training question generator
  for the listening ones. Scoring (`src/lib/placement.ts`) maps to a
  starting level, which `seedProgressFromPlacement` (`src/lib/
  pathProgress.ts`) uses to seed every lesson's status (done/available/
  locked) in one pass. "Skip" takes the stated instrument experience
  instead and seeds a mid-strength default.
- **Home hub** (`src/pages/HomePage.tsx`, C1) — streak/level/unit stats,
  a "Continue the Path" hero pointing at the current lesson, and the
  practice-tools grid (shared with the Tools tab via `src/lib/tools.ts`).
- **Path** (`src/pages/PathPage.tsx`, D1) — units and lessons with status
  bubbles (done ✓ / in progress ▶ / available ▶ / locked 🔒), driven by
  `getAllLessonProgress`/`statusFor`.
- **Lesson loop** (`src/pages/lesson/`, D2 + E1–E5) — intro screen, then
  one component cycling through Read (concept + formula) → See (`Fretboard`
  with lesson-specific markers) → Hear (`PlayButton` + animated note chips,
  reusing `playbackEngine`) → Play (wrapped in the shared `MicGate`,
  matching against expected notes via the extracted, fully unit-tested
  `playMatcher.ts`) → Complete (XP/streak/notes-clean stats, next lesson
  unlock card). Completing a lesson calls `completeLesson`, which marks it
  done, unlocks the next lesson, and bumps the daily streak.

**Bugs found and fixed during verification:** the lesson-complete screen's
"Day streak" stat was read from IndexedDB once on mount, before
`completeLesson` had bumped the streak — so it always displayed the
*pre-lesson* streak (e.g. `0` for a brand-new guest's first lesson) instead
of the just-updated value. Fixed by re-reading the streak after
`completeLesson` resolves, and removed the now-redundant mount-time fetch.

**Not yet verified:** the mic-dependent E4 Play step's actual pitch
matching against a real voice — this sandbox can't grant microphone
access, so verification here was limited to confirming `MicGate`'s A4→A5
permission-denied fallback renders correctly inside the lesson loop and
that "Continue without mic" correctly falls through to E5 Complete. The
matching logic itself (`playMatcher.ts`) is fully unit-tested in isolation.
Also, as with Milestone 3, the actual audio content of the Hear step
wasn't listened to — only verified via scheduling instrumentation
(`OscillatorNode`/`AudioBufferSourceNode` start-time interception) to
confirm the right notes are scheduled at the right times.

### Milestone 5 — Play & Feedback ✅

- **Exercise catalog** (`src/lib/exercises.ts`) — 6 static exercises across
  scales/arpeggios/exercises (C major scale, G major scale two octaves, A
  minor pentatonic, C major and A minor arpeggios, a chromatic run), each
  with an `expectedNotes` sequence built from the existing `theory.ts`
  formulas, plus a small fixed set of tempo options.
- **Exercise picker** (`src/pages/play/ExercisePickerPage.tsx`, I1) —
  category segmented control, a list of exercises with a "new" pill or the
  last run's score, and a tempo control that cycles through the presets.
- **Live play + results** (`src/pages/play/PlayExercisePage.tsx`, I2→I3,
  one component with internal steps like the lesson loop) — wraps the
  shared `MicGate`, matches live pitch against the exercise's expected
  notes via the existing `playMatcher.ts`, and additionally tracks
  note-to-note timing gaps and per-note cents to compute a timing
  percentage (`src/lib/timing.ts`) and an overall score
  (`src/lib/playRuns.ts`). Finishing writes a `PlayRun` and blends the
  score into a `play` `SkillProgress` record. The results screen shows
  clean-note count, timing %, score, a note-by-note strip, and a focus tip
  naming the single worst-tuned note (`focusTipFor`).

**Verified with real audio, not just the denied-mic fallback:** unlike
earlier milestones, this sandbox's headless browser *can* be given a fake
microphone — `getUserMedia` was overridden to return the output of a real
`OscillatorNode` routed through a `MediaStreamAudioDestinationNode`, so
the actual autocorrelation pitch detector processed genuine audio. Played
a full C major scale through it end to end (including one intentionally
sharped note), confirming: live note/cents/tuner-meter display, note-chip
advancement and off-pitch coloring, a written `PlayRun` with correct
per-note results, updated `skillProgress`, and a focus tip correctly
naming the worst offender.

**Bug found and fixed during this verification:** the live/results
transition never fired reliably — the completion `useEffect`'s cleanup
was clearing its `setTimeout` a moment after scheduling it, and because
`finishedRef` was set *before* the timeout ran, the effect refused to ever
reschedule a replacement, so the run silently never completed. Fixed by
only setting `finishedRef` inside the timeout callback itself, so a
torn-down-and-recreated effect can still schedule a fresh timer; only the
first one that actually survives to fire records the run. Confirmed fixed
by replaying the exact same scale and watching it reach the results screen.

**Not yet verified:** real-world mic latency/noise behavior on an actual
device (the fake-oscillator technique proves the pipeline is wired
correctly, but a real guitar signal through a real microphone is noisier
than a clean sine wave) and the tempo control's actual effect on timing
scoring beyond the unit-tested `timingPercentage` math.
