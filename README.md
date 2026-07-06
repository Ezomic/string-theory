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

### Milestone 6 — Progress, Daily Mix, Profile, Settings ✅

- **Microphone device picker** (Settings > Audio & mic) — the actual
  trigger for this milestone: `PitchEngine.start()` now accepts a
  `deviceId` and requests `getUserMedia` with `{ deviceId: { exact } }`
  when one's selected, so a USB audio interface or guitar-to-USB adapter
  can be used instead of the OS default mic. `usePitchEngine` reads the
  choice from the (now-expanded) `audioSettingsStore`, so every existing
  mic screen (tuner, drills, lesson Play, exercises) picks it up with no
  per-page wiring. The picker itself briefly requests mic permission just
  to unlock real device labels, then lists them via `enumerateDevices`.
- **Practice logging** (`src/lib/practiceLog.ts`) — the `practiceSessions`
  store existed since Milestone 0 but nothing ever wrote to it. Lesson
  completion, ear drills, the fretboard quiz, and play exercises now all
  log a few minutes of practice time and bump the streak, so Progress has
  real data instead of an empty store.
- **Progress overview** (`src/pages/progress/ProgressPage.tsx`, J1) —
  streak/lessons/minutes stat row, a 28-day `Heatmap` bucketed from
  practice sessions, and a combined skills list (real `SkillProgress`
  records for fretboard/play, plus ear-drill accuracy computed on the fly
  since those never got their own `SkillProgress` rows). Falls back to
  the K3 empty state when no practice sessions exist yet.
- **Achievements** (`src/lib/achievements.ts`, J2) — computed on demand
  from existing streak/lesson/drill/play/skill data rather than a new
  event-sourced unlock system; 9 badges using only what the app actually
  tracks (the mockup's "Tuned 50×" was dropped since tuner usage isn't
  instrumented, and "10 lessons" became "curriculum complete" scaled to
  the real curriculum size, since the mockup's number isn't reachable yet).
- **Skill detail** (J3) — generic drill-down for any skill key, with a
  "by string" breakdown shown only when `perStringBreakdown` data actually
  exists (nothing fabricated), and a "drill the weak spots" button that
  deep-links to the right practice screen per skill.
- **Daily mix** (`src/lib/dailyMix.ts`, C2) — a 4-step session (warm-up,
  weakest tracked skill, an ear drill, a play exercise), with per-step
  done/current/upcoming state persisted in `localStorage` (keyed by day)
  so it survives navigating away to actually do a step and resumes
  correctly on return.
- **Profile** (K2) and **Settings** (K1) — profile shows guest identity,
  active instrument, and placement level, honestly disabling
  account/plan/export/sign-out rows with the same no-backend note used
  since Milestone 4's guest onboarding. Settings covers default
  instrument, tuning (reuses the existing alt-tunings picker), left-handed,
  notation labels (names/intervals — the mockup's "solfège" option was
  dropped since nothing in the app can render it), retake placement,
  daily reminder (stored preference only, no real push notifications),
  the mic picker, and tuner calibration (cycles 438-442 Hz).

**Bugs found and fixed during verification:**
- The microphone picker's "Try again" button only changed UI state — its
  data-loading `useEffect` had an empty dependency array, so it never
  actually re-ran `getUserMedia`. A real permission denial would have
  left the screen stuck forever with a button that does nothing. Fixed by
  adding a retry counter to the effect's dependencies.
- `ComingSoonPage`, used as the Progress tab placeholder since Milestone 4,
  became fully unused once real pages landed for everything it stood in
  for — deleted rather than left as dead code.

**Verification approach:** the mic device picker's "granted" path (listing
real devices, selecting one, and confirming the choice reaches
`getUserMedia`) was verified with the same fake-oscillator-as-microphone
technique proven in Milestone 5, plus a mocked `enumerateDevices` to
simulate a USB interface being present — this is real end-to-end proof
the selected device ID reaches the Tuner's actual `getUserMedia` call, not
just a unit test of the settings store. Every other new screen was
exercised live in the browser (Progress empty state, real data after
generating an ear-drill result, achievements grid, skill detail, daily
mix's persistence across navigation, and every functional Settings row).

### Post-Milestone-6 — Randomized ear-drill sound

- Added `'random'` as a valid voice preference (`VoiceSelection = VoiceId
  | 'random'`) alongside the 10 fixed voices, made it the default for new
  and existing users, and added it as an entry in the existing `VoiceSelect`
  dropdown — which already lives inline on the drill screen, so switching
  between random and a fixed voice needs no navigation away from the
  exercise.
- `audioSettingsStore` gained `rerollPlaybackVoice()`: a no-op for a fixed
  voice, but picks a fresh random one and applies it to `playbackEngine`
  when the preference is `'random'`. `DrillPage` calls it once per new
  question (not per replay), so replaying a question keeps the same voice
  and only the *next* question can sound different.
- Added a one-time dismissible hint on the drill screen explaining the
  sound is randomized and how to lock one in, tracked via a `localStorage`
  flag (this is pure UI-dismissal state, not domain data, so it didn't
  need a new IndexedDB field).

**Verified live**: intercepted `OscillatorNode.start`/`AudioBufferSourceNode.start`
to confirm two consecutive questions in Random mode actually used
different voices (a plucked-string buffer voice, then a sawtooth
oscillator), that picking a fixed voice (Sine) stays consistent across
subsequent questions, and that dismissing the hint survives a reload.

### Post-Milestone-6 — Fretboard quiz per-string accuracy breakdown ([THI-168](https://linear.app/thijssen-software/issue/THI-168/fretboard-quiz-track-and-surface-per-string-accuracy-breakdown))

Milestone 6's J3 Skill detail screen always had the "by string" breakdown
card wired up, but it never rendered for any real skill — nothing ever
wrote `SkillProgress.perStringBreakdown`. The fretboard note-finding quiz
(`QuizPage`, G3) already knew exactly which string each tap landed on, it
just threw that away after checking correctness.

- **`src/lib/fretboardSkill.ts`** — extracted the quiz's persistence logic
  (previously inline in `QuizPage.tsx`) alongside two new pure functions:
  `stringLabel` (e.g. `"String 1 · E"`) and `blendStringBreakdown`, which
  folds a round's per-string correct/wrong tap counts into the persisted
  breakdown using the same 70/30 exponential-moving-average already used
  for overall `masteryPct` elsewhere, so one unlucky round can't wipe out
  a string's established mastery. Both are unit-tested, including the
  `recordQuizRound` DB-writing path (via `fake-indexeddb`, matching the
  existing `playRuns.test.ts` pattern).
- **`QuizPage.tsx`** — `handleFretTap` now records every tap (correct or
  wrong) per string number in a `useRef` map for the current round; on
  round completion that map is passed to `recordQuizRound` and reset. No
  UI changes were needed — `SkillDetailPage` already rendered the
  breakdown whenever it was present.

**Verified live**: played the quiz in-browser (one deliberate wrong tap on
the low E string, correct taps everywhere else), confirmed the resulting
`skillProgress` IndexedDB record held `{"String 1 · E": 50, "String 2 ·
A": 100, ...}`, then navigated to `/progress/skill/fretboardNotes` and
confirmed the "By string" card rendered six real rows with correct
Solid/Good/Shaky bands instead of staying hidden.

**Not yet verified:** the breakdown is tracked per string *number* across
whichever instrument variant (guitar/bass4/bass5) the quiz was last played
in — practicing both guitar and bass in the same session will blend two
different tunings' accuracy into the same string-number buckets. The
mockup only ever shows this for guitar, and splitting the breakdown per
variant would mean widening `SkillProgress`'s key scheme beyond what this
gap needed; worth revisiting if bass fretboard-notes practice turns out
to be common.

### Post-Milestone-6 — Tuner usage instrumentation + Tuned 50× achievement ([THI-170](https://linear.app/thijssen-software/issue/THI-170/instrument-tuner-usage-and-restore-the-tuned-50x-achievement))

The mockup's achievements grid includes a "Tuned 50×" badge, but
Milestone 6's README section notes it was dropped because tuner usage was
never instrumented anywhere. Fixed by tracking real in-tune events:

- **`src/lib/tunerStats.ts`** — a new `tunerStats` IndexedDB store (schema
  bumped to `DB_VERSION = 2`, with an `oldVersion`-gated `upgrade()` so
  existing local databases migrate cleanly instead of erroring) holding a
  single persisted `inTuneCount`. `recordTunerInTune()` increments it;
  unit-tested via `fake-indexeddb`.
- **`TunerPage.tsx`** — extracted the tuner's live readout into a
  `TunerReadout` child component (needed so a `useEffect` can track
  in-tune transitions without violating the rules of hooks inside
  `MicGate`'s conditional render-prop). It records exactly one event per
  not-in-tune → in-tune transition via a `useRef` flag — holding a string
  in tune, or wiggling around the threshold, doesn't spam the counter.
- **`achievements.ts`** — added `tunerInTuneCount` to `AchievementInput`
  and the `tuned50` badge (🎯, `count >= 50`) back to `ACHIEVEMENTS`,
  matching the mockup exactly. Renamed the pre-existing `perfectRun`
  badge's icon from 🎯 to 💯 to avoid a collision now that 🎯 is taken by
  the mockup's own "Tuned 50×" icon.

**Verified live**: faked microphone input (an `OscillatorNode` routed to
a `MediaStreamAudioDestinationNode`, the same technique as Milestones
5/6) at 440 Hz, confirmed the Tuner showed "In tune ✓" and the
`tunerStats` IndexedDB record incremented from 0 → 1 on that transition
and stayed at 1 while holding the note; detuned to +49¢ and confirmed the
UI correctly flipped to "Sharp ♯" with no further increment; retuned back
to 440 Hz and confirmed the count incremented to exactly 2 on the second
transition. Seeded `inTuneCount` to 50 directly and confirmed the
Achievements page showed "Tuned 50×" unlocked (10 badges total now, up
from 9).

**Bug found and fixed during this verification session (test-harness
only, not app code):** the fake-microphone technique from Milestones 5/6
didn't work on the first several attempts in this session — turned out
this preview tab runs backgrounded (`document.visibilityState ===
'hidden'`), which real browsers use to fully pause
`requestAnimationFrame`, and `PitchEngine.tick()`'s scheduling loop
depends on it. Polyfilling `requestAnimationFrame`/`cancelAnimationFrame`
with `setTimeout` for the verification session (not shipped) worked
around it. Separately, the first fake-stream attempts reused one
`MediaStream` across multiple `getUserMedia()` calls, and `PitchEngine
.stop()` (correctly) calls `track.stop()` on unmount — which permanently
killed the shared fake track the next time a screen remounted. Generating
a fresh oscillator/track per fake `getUserMedia()` call fixed it. Neither
issue is a defect in the app itself.

**Not yet verified:** real tuner usage on a real device/microphone (same
standing limitation as every other mic-dependent feature in this app).
