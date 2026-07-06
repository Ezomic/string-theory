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

### Post-Milestone-6 — Real daily reminder notifications ([THI-172](https://linear.app/thijssen-software/issue/THI-172/wire-the-daily-reminder-setting-to-real-browser-notifications))

Settings > Learning > "Daily reminder" persisted a boolean preference
since Milestone 6, but nothing ever read it — no notification of any
kind was ever shown. Wired it to the real Notification API:

- **`src/lib/dailyReminder.ts`** — `requestReminderPermission()` wraps
  `Notification.requestPermission()`; `shouldShowReminder()` is a pure
  gate (reminder on, permission granted, no practice logged yet today,
  past a fixed local hour of 18:00, not already shown today) fully
  unit-tested; `maybeShowDailyReminder()` reads today's
  `PracticeSession`s, applies the gate, and — since this is a PWA with no
  push backend, so this only ever fires while the app is open, not truly
  in the background — shows one real local notification via the
  registered service worker's `showNotification`, falling back to `new
  Notification()` if no registration exists (e.g. in dev). A
  `localStorage` flag (matching the precedent set by the ear-drill
  "randomized voice" hint dismissal in the Post-Milestone-6 section
  above) prevents firing twice in the same day.
- **`SettingsPage.tsx`** — turning the toggle on now calls
  `requestReminderPermission()` first; if the browser denies it, the
  toggle reverts to off and an inline note explains why, matching the
  app's "never a dead end" mic-permission convention rather than
  silently pretending the setting did something.
- **`App.tsx`** — after `audioSettingsStore` hydrates on app load, calls
  `maybeShowDailyReminder()` once with the hydrated `reminderOn` value.

**Verified live**: with the browser's real notification permission
starting `denied` in this sandbox, turning the toggle on correctly kept
it off and showed the "Notifications are blocked" note. Patched
`Notification.permission`/`requestPermission` to simulate a `granted`
browser, turned the toggle on, and confirmed it stayed on and
`Settings.reminderOn: true` persisted to IndexedDB. Directly invoked
`maybeShowDailyReminder` (via a dynamic `import()` in the live page, to
avoid a full reload dropping the test patches) with a faked evening
timestamp and no practice session logged: confirmed it called the real
`Notification` constructor with the expected title/body, then confirmed
calling it again the same "day" correctly did not fire a second time.

**Not yet verified:** the registered-service-worker `showNotification`
path specifically — `npm run dev` doesn't register a service worker
(only production builds do), so live verification exercised the `new
Notification()` fallback branch, not the `registration.showNotification`
branch. Also not verified: actual OS-level notification delivery/styling
on a real device, and whether 18:00 local is a sensible default reminder
hour for real usage patterns.

### Post-Milestone-6 — Wired the global notation-labels setting, added solfège ([THI-173](https://linear.app/thijssen-software/issue/THI-173/wire-the-global-notation-labels-setting-into-fretboard-rendering-add))

Settings > Learning > "Notation labels" persisted a names/degrees
preference (the `NotationLabels` type already included `'solfege'`), but
nothing in the app ever read it outside the settings row itself — every
fretboard-rendering screen hardcoded its own label style, so toggling
the setting visibly did nothing anywhere.

- **`theory.ts`** — added `solfegeLabel()` (movable-do syllables: Do, Ra,
  Re, Me, Mi, Fa, Fi, Sol, Le, La, Te, Ti, mirroring `intervalLabel`'s
  existing semitone-offset math) and `noteLabelFor(labelStyle, root,
  note)`, a small dispatcher over the three styles. `fretboardMarkersForNotes`'s
  label parameter is now typed as the shared `NotationLabels` (from
  `db/types`) instead of its own ad hoc `'names' | 'intervals'` union.
  All unit-tested.
- **`FretboardExplorerPage.tsx`** — Scale/Chord view labels now follow
  the global `notationLabels` setting instead of being hardcoded to note
  names. The mockup's own local "Show: Scale/Chord/Interval" three-way
  toggle is unchanged and still forces degree labels when "Interval" is
  explicitly picked (that's a genuine mockup-specified view mode, not a
  duplicate of the global setting) — the global preference only governs
  the default Scale/Chord label style.
- **`LessonLoopPage.tsx`**'s See step — same treatment; its `Fretboard`
  no longer hardcodes `labelMode="names"`.
- **`SettingsPage.tsx`** — the row now cycles through all three real
  values (names → degrees → solfège) via the same `nextInCycle` helper
  already used for tuner calibration, instead of only ever toggling
  between two.

**Verified live**: on the Fretboard Explorer (Scale mode, C major),
confirmed markers showed plain note names by default; set the global
setting to `solfege` directly via the store and confirmed the same
screen re-rendered with real syllables (Do, Re, Mi, Fa, Sol, La, Ti) with
no navigation or reload; then clicked the local "Interval" tab and
confirmed it correctly overrode to degree labels (R, 2, 3...) regardless
of the global solfège setting, proving the two controls compose as
intended rather than conflicting. On Settings, clicked the "Notation
labels" row three times and confirmed it cycled Note names → Intervals →
Solfège → (back to) Note names.

**Not yet verified:** solfège rendering on the lesson See step
specifically (verified via the shared `theory.ts`/`Fretboard` plumbing
and the Fretboard Explorer above, but not re-verified screen-by-screen
inside an actual lesson), and whether movable-do solfège is the
pedagogically expected convention for this app's target audience versus
fixed-do (a product/curriculum question, not a code one).

### Post-Milestone-6 — Real local "Export practice data" ([THI-176](https://linear.app/thijssen-software/issue/THI-176/add-real-local-export-practice-data-download-on-profile))

Profile's "Export practice data" row was disabled since Milestone 4,
bundled in with the genuinely account-dependent rows (Plan, Reminders &
email, Sign out) — but exporting a guest's own local data was never
actually blocked on having a backend; it's just serializing what's
already sitting in IndexedDB.

- **`src/lib/exportData.ts`** — `buildExportData()` iterates every
  `IDBDatabase.objectStoreNames` (rather than hardcoding the store list,
  so it can't silently go stale as new stores get added) and reads each
  one via `getAll`, returning `{ exportedAt, data }`. `downloadExport()`
  serializes that to JSON and triggers a real browser file download via
  a Blob URL + a clicked `<a download>`. Both unit-tested with
  `fake-indexeddb`.
- **`ProfilePage.tsx`** — the row is enabled and calls
  `buildExportData()`/`downloadExport()`, showing "Exporting…" while in
  flight. Re-worded the guest note, which previously (inaccurately)
  claimed "data export isn't available yet" alongside the genuinely
  unavailable account/sync features.

**Verified live**: seeded a practice session directly into IndexedDB,
intercepted `URL.createObjectURL` and `HTMLAnchorElement.click` to
capture the download without a real file-save dialog, clicked "Export
practice data", and confirmed the captured blob was valid JSON
containing every object store (including the seeded `practiceSessions`
record) under the expected filename
(`string-theory-export-<date>.json`).

**Not yet verified:** nothing structurally — this is a pure local
read/serialize/download with no mic or timing dependencies, so this
session's browser verification is complete. Re-importing an exported
file isn't a feature (out of scope here); this is one-way data
portability only.

### Post-Milestone-6 — Mic permission now persists across navigation ([THI-178](https://linear.app/thijssen-software/issue/THI-178/persist-mic-permission-grant-across-navigation-between-mic-screens))

Milestone 1's README section flagged this as worth doing "once more mic
screens exist" — by Milestone 6 there are four (Tuner, lesson Play step,
ear-drill call-and-response, Play exercises), and each one's `MicGate`
re-showed the A4 "Let String Theory hear you" explainer every time, even
right after granting access on a different screen a moment earlier.

- **`src/store/micPermissionStore.ts`** — a new, deliberately
  session-only (not IndexedDB-persisted) Zustand store holding a single
  `granted` boolean, separate from `audioSettingsStore` since this
  tracks a live `getUserMedia()` outcome, not a durable preference.
- **`usePitchEngine.ts`** — each screen still gets its own `PitchEngine`
  instance (still has to call `getUserMedia` again for its own
  `MediaStream` — this didn't change), but `permissionState` now
  initializes to `'granted'` when the shared store says so, and a
  mount-only effect auto-calls `requestAccess()` in that case instead of
  waiting for the user to tap "Enable microphone" again. Every
  `requestAccess()` call (auto or manual) updates the shared store, so a
  later revocation/denial on any screen still falls through to the
  normal A5 flow next time.

**Verified live**: granted mic access on the Tuner (via the fake
oscillator-as-microphone technique), then navigated directly to
`/tools/play/c-major-scale` (a completely different mic screen) and
confirmed it skipped the A4 explainer entirely, going straight to a live
"In tune ✓" readout. Confirmed a full page reload (a fresh session)
correctly resets back to showing A4 again — this persists only within
one running session, not permanently.

**Not yet verified:** whether skipping A4 without any user click could
feel surprising as a UX moment rather than a convenience (i.e. no
usability testing with the actual target audience) — the code behavior
itself is confirmed correct, but the underlying assumption ("no
re-confirmation needed after an in-session grant") is a product read,
not something a browser test can validate. Also, as with every other mic
feature: not verified on a real device/microphone.

### Post-Milestone-6 — Curriculum expanded from 5 to 15 lessons ([THI-179](https://linear.app/thijssen-software/issue/THI-179/expand-curriculum-from-5-lessons-to-15-across-the-3-existing-units))

`curriculum.ts` only had 5 lessons across 3 units (2/2/1) — a real
learner exhausts the entire Path in one sitting. Tripled it to 5 lessons
per unit (15 total), reusing only scale/chord catalog entries that
already existed in `theory.ts` (major, natural minor, major/minor
pentatonic scales; major, minor, diminished, augmented, dom7, maj7, m7
chords) so no new theory data had to be invented, and staying within the
existing 1-3 placement level system unchanged.

- **Unit 1 (Intervals & Steps)** gains *Major vs Minor Thirds*, *Perfect
  Fourths and Fifths*, and *The Leading Tone*.
- **Unit 2 (Scales & Keys)** gains *The Natural Minor Scale*, *Major
  Pentatonic*, and *Minor Pentatonic*.
- **Unit 3 (Chords on the Neck)** gains *Minor Triads*, *Diminished &
  Augmented Triads*, *Dominant 7th Chords*, and *Major 7 and Minor 7
  Chords*.
- Every new lesson's `hear`/`play` note lists were computed from
  `notesForFormula`/`transposeNote` (not hand-typed), so they're
  guaranteed to match real music theory rather than being invented
  prose — e.g. "Diminished & Augmented Triads" demonstrates a real B
  diminished triad (B-D-F), and "Major 7 and Minor 7 Chords" demonstrates
  a real Cmaj7 (C-E-G-B).
- Added `curriculum.test.ts` coverage for the new shape: exactly 5
  lessons per unit, sequential global `order` with no gaps, every
  lesson's `see.formulaId` resolving to a real `SCALES`/`CHORDS` entry,
  and every lesson having at least one note to hear/play.
- Deliberately did *not* invent new scale/chord types or a 4th unit —
  placement (`levelFromScore`/`levelFromExperience` in `placement.ts`)
  hard-caps at level 3, so a new unit at level 4+ would never actually
  be reachable through placement; deepening the existing 3 units was the
  only change that didn't also require touching placement logic.

**Verified live**: seeded placement at level 1 and confirmed the Path
page renders all 15 lessons across the 3 units in the right order;
opened the new "Major vs Minor Thirds" lesson and stepped through
Read → See → Hear, confirming the fretboard correctly highlighted a real
C minor triad (C, D#, G) with the root in amber, and the Hear step
showed the same three note chips.

**Not yet verified:** the remaining 8 new lessons' Read/See/Hear/Play
steps weren't each individually clicked through in the browser (only
"Major vs Minor Thirds" was, as a representative sample) — but the new
`curriculum.test.ts` coverage validates every lesson's data shape
(valid catalog references, non-empty note lists), and all Read/See/Hear
rendering code is identical, pre-existing, unchanged code already
exercised by the lessons that shipped in Milestone 4.

### Post-Milestone-6 — Scale-recognition ear drill now includes major/minor pentatonic ([THI-209](https://linear.app/thijssen-software/issue/THI-209/expand-ear-training-scale-recognition-variety-with-pentatonic-scales))

`SCALE_QUALITIES` in `earTraining.ts` only ever had `major`/`naturalMinor`,
even though the app teaches both pentatonic scales elsewhere (the
curriculum's "Major Pentatonic"/"Minor Pentatonic" lessons from THI-179,
and Fretboard Explorer) and `theory.ts` already has real
`majorPentatonic`/`minorPentatonic` catalog entries with correct
formulas — this drill was just never taught them.

- **`earTraining.ts`** — added `majorPentatonic`/`minorPentatonic` to
  `SCALE_QUALITIES`, reusing `theory.ts`'s existing formulas (no new
  theory data invented). Added `scaleQualitiesForLevel`, mirroring the
  existing `intervalsForLevel`/`chordQualitiesForLevel` pattern: level 1
  stays major-vs-minor only (unchanged difficulty for beginners), and
  levels 2+ open up all four, matching this drill's existing "harder
  choices unlock as you level up" design already used for intervals and
  chord quality.
- **`DrillPage.tsx`** — updated the scale-recognition prompt from the
  hardcoded `'Major or minor?'` to `'Which scale did you hear?'`, since
  there can now be up to 4 possible answers instead of always 2.
- Added `earTraining.test.ts` coverage: confirms level 1 still offers
  only Major/Minor (regression-proofing the existing test), confirms
  level 2 can produce all four labels (`Major`, `Minor`, `Major
  pentatonic`, `Minor pentatonic`) across repeated draws, and confirms a
  pentatonic question plays exactly 5 notes (a pentatonic scale has 5
  degrees vs. 7 for major/minor).

**Verified live**: at level 1 (no seeded data), confirmed the drill
still shows only Major/Minor and the updated "Which scale did you
hear?" prompt. Seeded 5 correct `scaleRecognition` `DrillResult` rows
(crossing the level-2 threshold), reloaded, and confirmed all four
options now appear (Major, Minor, Major pentatonic, Minor pentatonic).
Clicked a wrong answer and confirmed the existing answer-review flow
(✓/✕ markers, hint text, "Got it — next") works correctly with the
new options.

**Not yet verified:** the actual audio played for pentatonic questions
wasn't verified by ear in this session (sandbox has no audio output
verification) — but the frequency math is the same
`hzForSemitones`/formula-mapping code path already exercised and
verified for major/minor scales, just applied to the pentatonic
formulas.
