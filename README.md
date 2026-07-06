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

### Post-Milestone-6 — Real chord-progression ear-training generator ([THI-196](https://linear.app/thijssen-software/issue/THI-196/build-a-real-chord-progression-ear-training-generator))

The ear-training drill picker unlocks "Chord progressions" at Interval
Lv4, but `earTraining.ts`'s `generateQuestion` had a literal comment —
`// intervals (and progressions, until it has its own generator)` — and
silently served mislabeled interval questions under the `progressions`
category the whole time.

- **`earTraining.ts`** — added 4 real diatonic progressions (I–IV–V–I,
  I–V–vi–IV, ii–V–I, vi–IV–I–V), each defined as a list of scale-degree
  root offsets + the existing major/minor triad formulas from
  `theory.ts` (no new chord data invented). Levels 1-2 offer the two
  most common pop progressions; level 3+ unlocks the jazz/minor ones.
  `DrillQuestion` gained an optional `chordFrequencyGroups: number[][]`
  (one frequency group per chord) alongside the existing flat
  `frequencies` field.
- **`playbackEngine.ts`** — added `playChordProgression()`, which plays
  each chord's frequency group together and advances to the next chord
  after a short gap — the existing `playSequence`/`play` methods only
  ever handled one flat list of frequencies, with no notion of "these
  three notes are one chord, then these three are the next."
- **`DrillPage.tsx`** — `playCurrent()` now branches to
  `playChordProgression` when the question carries chord groups, and
  the prompt text gained "What chord progression did you hear?"

**Verified live**: navigated directly to
`/tools/ear/drill?category=progressions`, confirmed the two level-1
choices render ("I – IV – V – I" / "I – V – vi – IV") with the correct
prompt text, then intercepted `AudioBufferSourceNode.start` (the pluck
voices' actual synthesis primitive — plain `OscillatorNode` wasn't the
right thing to intercept for the default "Random" voice) and confirmed
replaying the question scheduled exactly 4 groups of 3 simultaneous
notes each, roughly 0.95s apart — a real 4-chord progression, not a
single interval or chord.

**Not yet verified:** the higher-level (ii–V–I / vi–IV–I–V) progressions
weren't individually played back and listened to in this sandbox — only
generated and asserted on via the unit tests and the level-1 pair's live
playback above; the underlying chord/triad math is shared with the
already-verified level-1 progressions, so this is a lower-risk gap than
most "not yet verified" notes in this README.

### Post-Milestone-6 — Lesson See step now follows the learner's actual instrument ([THI-197](https://linear.app/thijssen-software/issue/THI-197/make-lesson-see-step-follow-the-learners-actual-selected-instrument))

Every lesson's `instrumentNote` field says "Guitar & bass", but every
lesson's `see` step hardcoded `instrument: 'guitar'` — so a bass player
going through the entire curriculum saw an irrelevant 6-string guitar
neck on every single "See it on the neck" step, using a fixed standard
tuning rather than whatever the user actually has configured (including
alt tunings).

- **`curriculum.ts`** — removed the now-dead `instrument` field from
  `LessonSeeStep` (and the `Instrument` import it needed) across all 15
  lessons; the See step never needs to know which instrument, since
  that's a live user preference, not fixed lesson content.
- **`LessonLoopPage.tsx`** — the See step's `Fretboard` now reads
  `activeInstrument` and the matching `InstrumentConfig.tuning` straight
  from `instrumentStore`, replacing the hardcoded `GUITAR_TUNING`/
  `BASS_TUNING` constants. This also means a bass player's actual chosen
  tuning (standard, 5-string, drop-D, etc.) is reflected, not just a
  fixed 4-string standard assumption.

**Verified live**: set the active instrument to bass via the store,
opened "Building the Major Scale"'s See step, and confirmed the
fretboard rendered a real 4-string bass neck (`aria-label="bass
fretboard"`, E-A-D-G tuning) instead of guitar; switched back to guitar
and confirmed the same screen correctly reverted to a 6-string guitar
neck (`aria-label="guitar fretboard"`).

**Not yet verified:** 5-string bass and alt-tuning configurations
specifically (only the default 4-string standard bass tuning was
exercised live) — though the fix reads `InstrumentConfig.tuning`
directly, the same field the Tuner and Fretboard Explorer already
render correctly for every preset, so this is low-risk.

### Post-Milestone-6 — Left-handed setting now actually mirrors the fretboard ([THI-198](https://linear.app/thijssen-software/issue/THI-198/wire-the-left-handed-setting-into-every-fretboard-rendering-screen))

Settings > Instrument > Left-handed persists per-instrument via
`instrumentStore`, and `Fretboard.tsx`'s own `visualRow()` logic already
correctly mirrors string order when `leftHanded` is true — but every
screen that renders a `Fretboard` (the lesson See step, Fretboard
Explorer, and the note-finding Quiz) hardcoded `leftHanded={false}`, so
the toggle had zero visible effect anywhere in the app despite being a
fully working feature at the component level.

- **`FretboardExplorerPage.tsx`** / **`QuizPage.tsx`** — both have their
  own local guitar/bass4/bass5 variant picker independent of the global
  active instrument, so `leftHanded` is read from
  `instrumentStore.configs[variant === 'guitar' ? 'guitar' : 'bass']` —
  matching whichever instrument type is currently selected on that
  screen.
- **`LessonLoopPage.tsx`** — reads `configs[activeInstrument].leftHanded`
  from the global active instrument, consistent with how Settings itself
  displays/edits the toggle.

**Verified live**: on the Fretboard Explorer, confirmed the default
layout (high E on top, low E on bottom); flipped `leftHanded` to `true`
via the store and confirmed the same screen re-rendered mirrored (low E
on top, high E on bottom) with no navigation or reload. Repeated the
same check on the Quiz screen, additionally tapping one of the visually
mirrored ghost-marker positions and confirming it correctly registered
as "found" (proving tap targets stay correctly aligned with the mirrored
visual layout, not just the visuals). Confirmed the lesson See step
mirrors identically.

**Not yet verified:** bass5/left-handed combinations specifically (only
guitar was exercised live) — lower risk since all three screens share
the exact same `Fretboard` component and mirroring logic already proven
correct for guitar.
### Post-Milestone-6 — Reconciled lesson progress after curriculum growth ([THI-199](https://linear.app/thijssen-software/issue/THI-199/reconcile-existing-lesson-progress-after-curriculum-content-grows))

Growing curriculum content from 5 to 15 lessons (the previous entry)
introduced a real regression for anyone who already had progress: a
newly-inserted lesson positioned earlier in `order` than one the user
had already unlocked (or completed) got no `lessonProgress` record at
all, and `statusFor()` defaults an unrecorded lesson to `'locked'` —
permanently, since `completeLesson` only ever advances the single next
lesson by order, never sweeps backfill gaps.

- **`pathProgress.ts`** — added `reconcileLessonProgress()`: for every
  lesson with no progress record, if any *later* lesson (by order)
  already has a non-`'locked'` status, backfill this one as `'done'`
  too (same "already past this, count it as known" convention
  `seedProgressFromPlacement`'s `lessonsToAutoComplete` already uses for
  skipped units). A lesson beyond the user's actual unlocked frontier is
  correctly left alone. No-op for a never-seeded profile — placement
  seeds everything from scratch instead.
- **`App.tsx`** — calls it once on app load, alongside the existing
  hydration/reminder-check effect.

**Verified live**: seeded progress at placement level 2 (auto-completing
unit 1, unlocking "Building the Major Scale"), then deleted "Major vs
Minor Thirds"'s `lessonProgress` record directly in IndexedDB to
simulate a lesson that didn't exist when this profile was first seeded.
Confirmed it had no record at all beforehand; reloaded the app (running
the real mount-time reconciliation) and confirmed it was backfilled to
`done` (100%), while "Building the Major Scale" stayed correctly
untouched at "Ready to start" — verified both via direct IndexedDB
inspection and visually on the Path page (Unit 1 showing 5/5 complete).

**Not yet verified:** nothing structurally — this is a pure IndexedDB
read/backfill with no mic, audio, or timing dependencies, so browser
verification here is complete.
### Post-Milestone-6 — Daily Mix's weak spot can now be an ear-training skill ([THI-200](https://linear.app/thijssen-software/issue/THI-200/include-ear-training-skills-in-daily-mixs-weak-spot-picker))

`dailyMix.ts`'s weak-spot picker only ever compared `fretboardNotes` and
`play` `SkillProgress` records — it never considered the three
ear-training categories (intervals, chord quality, scale recognition),
even though their accuracy was already computed elsewhere via
`statsForCategory`. A user who was great at fretboard/play but
genuinely weak at, say, chord-quality ear training would never see that
targeted in their Daily Mix.

- **`dailyMix.ts`** — `weakestSkillStep` now takes the same combined
  `SkillDisplay[]` list `progress.ts`'s `buildSkillsList` already builds
  for the Progress page (J1) — reusing its existing SkillProgress +
  ear-drill-accuracy merge instead of duplicating a second one. Added a
  guard so the weak-spot pick can never repeat the exact same route as
  the mix's fixed "Interval ear training" step (which would otherwise
  show the identical drill twice if intervals happened to be the
  overall weakest).
- **`DailyMixPage.tsx`** — now fetches `drillResults` alongside
  `skillProgress` and calls `buildSkillsList` before `buildDailyMix`.

**Verified live**: seeded a strong `fretboardNotes` SkillProgress (90%)
and two low-scoring `chordQuality` drill results (20% accuracy),
reloaded Daily Mix, and confirmed step 2 now reads "Chord quality drill
· Your weak spot" (previously impossible — this category was invisible
to the picker entirely); tapped through the mix and confirmed it
actually routes to `/tools/ear/drill?category=chordQuality`, not the
generic fretboard fallback.

**Not yet verified:** the dedup guard's exact behavior when *only*
intervals is weak and no other skill is tracked yet (falls back to the
default fretboard weak spot per the code path, but this exact scenario
wasn't separately re-confirmed live beyond the unit test covering it).
### Post-Milestone-6 — Play exercises catalog expanded from 6 to 10 ([THI-201](https://linear.app/thijssen-software/issue/THI-201/expand-the-play-exercises-catalog))

`exercises.ts` had only 6 exercises, and none matched the scale/chord
types the curriculum expansion (previous entry) just started teaching —
a learner could reach Unit 3's dominant-7th/major-7th/minor-7th lessons
with nothing in Play & Feedback to actually practice those chords on.

- Added **A natural minor scale** (1 octave, the relative minor of C
  major already used elsewhere in the app) to the Scales tab.
- Added **G7**, **Cmaj7**, and **Am7 arpeggios** (dominant 7th, major
  7th, minor 7th) to the Arpeggios tab — all computed via
  `notesForFormula` from the same `CHORDS` catalog entries the
  curriculum lessons use, so the actual notes are guaranteed correct
  rather than hand-typed.
- Added `exercises.test.ts` coverage asserting the exact note sequence
  for each new 7th-chord arpeggio and the new scale.

**Verified live**: opened the Scales tab and confirmed "A natural minor
scale" renders with a "new" pill; switched to the Arpeggios tab and
confirmed all three new 7th-chord arpeggios render with correct
subtitles ("dominant 7th", "major 7th", "minor 7th"); navigated directly
to `/tools/play/g-dominant-7-arpeggio` and confirmed it resolves to a
real exercise screen (title "G7 arpeggio", correct tempo) rather than a
missing-exercise fallback.

**Not yet verified:** didn't grant microphone access and play any new
exercise through to a scored result in this session — the `PlayExercisePage`
rendering/matching code itself is unchanged, pre-existing code already
verified end-to-end (including the fake-mic technique) in Milestone 5;
only the new note-sequence data is new here, and that's covered by the
unit tests confirming each arpeggio's exact notes.
### Post-Milestone-6 — Retaking placement no longer destroys real lesson progress ([THI-202](https://linear.app/thijssen-software/issue/THI-202/stop-retake-placement-from-destroying-already-completed-lesson))

`seedProgressFromPlacement` unconditionally overwrote every lesson's
IndexedDB record based on the new placement result — auto-completed
lessons under the new level got fabricated `score: 100` records, the
computed starting lesson became `'available'`, and everything else
became `'locked'`. This ran every single time, so a learner who had
genuinely completed real lessons (with real scores from actually
playing through them) and then used Settings > Retake placement check
— even just to see their level, or scoring lower that session — had
that completed history silently destroyed and replaced with fabricated
data. A real, if quiet, data-loss bug.

- **`pathProgress.ts`** — `seedProgressFromPlacement` now never
  overwrites a lesson already at `'done'` or `'in_progress'`. The
  `'available'` starting-lesson pointer is recomputed as the first
  lesson (by order) that isn't already done — whether from real
  completion or the new placement's auto-complete set — instead of
  blindly using the placement level's nominal starting lesson, so a
  learner with real progress past that point can't end up with nothing
  available.
- **`curriculum.ts`** — removed `startingLesson()`, the now-fully-unused
  helper this replaced (along with its tests in `curriculum.test.ts`).

**Verified live**: seeded real progress (completed two lessons with
scores 93% and 81% via `completeLesson`, matching what actually playing
through a lesson writes), then called `seedProgressFromPlacement` again
at the same level (simulating a retake) and confirmed both lessons kept
their exact real scores and `completedAt` timestamps, with the third
lesson correctly becoming `'available'` as the true next lesson.
Confirmed the same visually on the Path page — "Completed · 93%" and
"Completed · 81%" persisted, "Major vs Minor Thirds" showed "Ready to
start", and everything beyond stayed locked.

**Not yet verified:** the retake-at-a-higher-level path specifically
wasn't re-verified live in this session (only via the unit tests) —
lower risk since that code path is unchanged from before this fix.
### Post-Milestone-6 — Added the mockup's "Full unit" achievement ([THI-204](https://linear.app/thijssen-software/issue/THI-204/add-the-mockups-full-unit-achievement-badge))

The mockup's achievements grid has a distinct "Full unit" badge (finish
every lesson in any one unit), separate from `curriculumComplete` (all
15 lessons across all 3 units) — a much higher bar our app already
tracked. "Full unit" itself was never implemented; now that units are 5
real lessons each, finishing just one is a genuine, meaningfully-earlier
milestone worth its own badge.

- **`achievements.ts`** — added `hasCompletedAnyUnit()`, checking
  whether every lesson in any single `UNITS` entry has a `'done'`
  `LessonProgress` record, and the `fullUnit` badge (📚) it feeds.

**Verified live**: seeded placement and completed all 5 of Unit 1's
lessons via `completeLesson`, then confirmed the Achievements page
showed "Full unit" unlocked (real icon, not 🔒) while "Curriculum
complete" correctly stayed locked (5 of 15 lessons done, nowhere near
all of them).

**Not yet verified:** nothing structurally — this is a pure IndexedDB
read/compute with no mic, audio, or timing dependencies, so browser
verification here is complete.
### Post-Milestone-6 — Registered 'progressions' in the shared skill metadata map, fixed ear-drill mastery always showing 0% ([THI-205](https://linear.app/thijssen-software/issue/THI-205/register-progressions-in-the-shared-skill-metadata-map))

`progress.ts`'s `SKILL_META` (the map `buildSkillsList` uses to power
both the Progress page's J1 skills list and Daily Mix's weak-spot
picker from THI-200) had no entry for `progressions`, the chord-progression
ear-training category built in THI-196. Real `DrillResult` rows were
being written correctly every time a user answered a progression
question, but with no `SKILL_META` entry, `buildSkillsList` silently
dropped that data — `progressions` could never appear on the Progress
page, had no reachable Skill Detail route, and could never be picked as
a Daily Mix weak spot.

- **`progress.ts`** — added a `progressions` entry to `SKILL_META`
  (label "Chord progressions (ear)", routing to
  `/tools/ear/drill?category=progressions`), so it now flows through
  `buildSkillsList` like the other three ear-drill categories.
- **`SkillDetailPage.tsx`** — while wiring `progressions` into this
  page's icon map, found a real pre-existing bug: the page only ever
  fetched `skillProgress` records, never `drillResults`, so every
  ear-training skill key (`intervals`, `chordQuality`,
  `scaleRecognition`, and now `progressions`) always displayed "0%
  mastery" on its detail page regardless of actual drill accuracy —
  because ear-drill mastery lives exclusively in `DrillResult` data
  (via `statsForCategory`), never in a `SkillProgress` row. Fixed by
  also fetching `drillResults` and computing `masteryPct` from
  `statsForCategory` for any key in `DRILL_CATEGORIES`, falling back to
  the existing `SkillProgress`-based calculation for non-ear-drill
  skills (fretboard, play). This was the same code path already being
  touched for the `progressions` registration, so fixing it now avoided
  shipping a fix that still displayed the wrong number for every
  ear-drill skill's detail page.

**Verified live**: seeded real `DrillResult` rows for both `intervals`
(9/10 correct → 90%) and `progressions` (6/8 correct → 75%) directly
into IndexedDB, then navigated to `/progress/skill/progressions` and
confirmed it now shows "You're at 75% mastery on this skill" (previously
this route wasn't even reachable, since `progressions` had no
`SKILL_META` entry). Navigated to `/progress/skill/intervals` and
confirmed the 0%-mastery bug fix generalizes — it now correctly shows
90% instead of the previous hardcoded 0%.

**Not yet verified:** the Progress page's J1 skills list itself wasn't
re-screenshotted with seeded data in this session (the empty-state gate
there is driven by `practiceSessions`, a separate check from the skill
data fixed here) — but `buildSkillsList`'s existing unit test coverage
(extended in this change) directly verifies `progressions` now appears
in that list's output with the correct label, route, and mastery
percentage.
### Post-Milestone-6 — Unlocked "Chord progressions" now appears in DrillPage's quick-switch pills ([THI-206](https://linear.app/thijssen-software/issue/THI-206/show-unlocked-chord-progressions-in-drillpages-quick-switch-pills))

`DrillPage.tsx`'s in-drill category-switch pills filtered
`DRILL_CATEGORIES` with `.filter((c) => !c.unlockRule)`, which
unconditionally excluded `progressions` regardless of whether the
learner had actually unlocked it (intervals level ≥ 4). This was
inconsistent with `EarTrainingPickerPage.tsx`, which correctly computes
real unlock status from the learner's actual intervals level. A learner
who had genuinely unlocked chord progressions from the picker page still
never saw it as a quick-switch option while mid-drill on another
category.

- **`DrillPage.tsx`** — now fetches `drillResults` into state (it
  already fetched them locally inside a `useEffect` for level/question
  generation, just never retained them), derives `intervalsLevel` from
  `statsForCategory`, and replaces the blanket `!c.unlockRule` filter
  with an `isUnlocked` check that mirrors `EarTrainingPickerPage.tsx`'s
  existing unlock logic exactly.

**Verified live**: with no seeded data, confirmed the pill row shows
only Intervals / Chord quality / Scale recognition — "Chord
progressions" correctly stays hidden while locked (baseline, matching
prior behavior). Seeded 15 correct `intervals` `DrillResult` rows
directly into IndexedDB (crossing the level-4 threshold), reloaded, and
confirmed "Chord progressions" now appears as a 4th pill; clicking it
navigated to `/tools/ear/drill?category=progressions` as expected.

**Not yet verified:** no component-test coverage was added for this
change — this codebase has no React component test infrastructure yet
(only pure-logic tests under `src/lib/**/*.test.ts`), and the new
`isUnlocked` logic is a direct mirror of the already-shipped, unchanged
logic in `EarTrainingPickerPage.tsx`, so the live browser verification
above was judged sufficient rather than introducing new test tooling
for a two-line conditional.
### Post-Milestone-6 — Microphone picker now updates the shared mic-permission store ([THI-208](https://linear.app/thijssen-software/issue/THI-208/wire-microphone-picker-into-the-shared-mic-permission-store))

`MicrophonePickerPage.tsx` calls `getUserMedia` directly (briefly, just
to unlock readable device labels) but never told
`useMicPermissionStore` about the outcome — unlike `usePitchEngine.ts`,
which every other mic screen (Tuner, ear drills, Play) goes through, and
which has always synced this store since THI-178. So a grant obtained
via the Microphone picker in Settings didn't let those other screens
skip the A4 "Let String Theory hear you" explainer afterward in the same
session, inconsistent with the cross-screen persistence THI-178
established everywhere else.

- **`MicrophonePickerPage.tsx`** — calls
  `useMicPermissionStore`'s `setGranted(true)` right after a successful
  `getUserMedia`, and `setGranted(false)` in the existing denied catch
  branch, mirroring `usePitchEngine.ts`'s
  `setGrantedThisSession(state === 'granted')` pattern exactly.

**Verified live**: with the sandbox's default (denied) mic behavior,
confirmed the existing "Try again" denied state still appears
unchanged. Then mocked `navigator.mediaDevices.getUserMedia`/
`enumerateDevices` to simulate a real grant + a fake USB input device,
clicked "Try again," and confirmed the picker now lists the fake
device. Navigated client-side (no full reload, to keep the in-memory
store intact — the store is deliberately session-only, not persisted)
to the Tuner screen and confirmed it skipped the A4 explainer entirely,
going straight into the live tuner UI (note readout, meter, string
targets) — matching the exact cross-screen behavior already verified
for other mic screens in THI-178.

**Not yet verified:** on a real device with a real microphone (same
limitation as every other mic feature in this project — the sandbox has
no real audio input, so the granted path had to be exercised via a
mocked `getUserMedia`/`enumerateDevices` rather than an actual OS
permission prompt).
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

### Post-Milestone-6 — Tuner calibration now actually reaches the live pitch engine ([THI-213](https://linear.app/thijssen-software/issue/THI-213/wire-tuner-calibration-setting-into-the-live-pitch-engine))

Settings > "Calibrate tuner" cycles `instrumentStore`'s `referencePitch`
through 438-442 Hz and shows "A = 441 Hz," but `usePitchEngine` never
read that value — `PitchEngine` always graded pitch against its
hardcoded 440 Hz default regardless of what calibration a user picked.
`MicGate` did expose a `setReference` render-prop control for this
exact purpose, but none of its three consumers (Tuner, the lesson Play
step, Play exercises) ever called it — dead API surface hiding a real
bug.

- **`usePitchEngine.ts`** — now reads `referencePitch` directly from
  `instrumentStore` (mirroring how it already reads `micDeviceId`) and
  calls `engineRef.current.setReference(referencePitch)` in a `useEffect`
  that reacts to changes, so every mic screen picks up calibration
  automatically without each one needing to wire it manually. Since
  Settings' "Calibrate tuner" keeps both instruments' `referencePitch`
  in sync, this reads the shared value regardless of which instrument
  is active.
- **`MicGate.tsx`** — removed the now-fully-unused `MicGateControls`
  render-prop surface (`setReference`) that no consumer ever called;
  `children` is now just `(reading) => ReactNode`, matching how every
  consumer already used it.

**Verified live**: mocked `getUserMedia`/`AudioContext` to get a real
`PitchEngine` instance running without an actual microphone, and
monkey-patched `PitchEngine.prototype.setReference` to record every
call. Calibrated to 441 Hz in Settings, navigated to the Tuner, and
confirmed `setReference(441)` fired on mount (not the old hardcoded
440). Then, with the Tuner still mounted and the mic granted, called
`instrumentStore.setReferencePitch('guitar', 442)` directly and
confirmed the engine reactively picked up 442 without leaving/reentering
the screen — proving the fix isn't just a one-time read at mount.

**Not yet verified:** the actual cents-offset math against a real
microphone and real note (i.e., that a note genuinely reads as "in
tune" against a 441 Hz reference rather than 440) — same sandbox
limitation as every other mic feature in this project. The reference
value flowing into `PitchEngine.setReference` is directly confirmed;
`hzToNote`'s use of that reference is pre-existing, unchanged code.
### Post-Milestone-6 — Placement's "Chords & theory" result row now reads the right strength ([THI-215](https://linear.app/thijssen-software/issue/THI-215/fix-placements-chords-and-theory-result-row-using-the-wrong-strength))

`PlacementPage.tsx`'s B4 result screen has a row labeled "Chords &
theory," but its `Pill` read `strengths.theory` — the same value
already shown correctly on a different row's math — while
`strengths.chords`, a dedicated field `finish()` computes and persists
specifically for this row, was calculated, written to
`placementResults`, and then never actually read anywhere in the UI.

- **`PlacementPage.tsx`** — the "Chords & theory" `Pill` now reads
  `strengths.chords` instead of `strengths.theory`. Since `chords` is
  derived on a 0/0.7 scale (not `theory`'s 0.5/1 scale), the "Strong"
  threshold changed from `>= 1` to `>= 0.7` to match the field's actual
  range — the old `>= 1` check could never have been true for `chords`
  in the first place.

**Verified live**: ran the placement check start-to-finish twice.
First, all 4 theory questions correct (theory strength "strong") — the
row correctly showed "Strong" in both the old and new code, so this
alone wouldn't prove the fix mattered. Re-ran with exactly 3 of 4 theory
questions correct (theory strength "good," not "strong"): the row now
shows **"Strong"** (from `strengths.chords`, which only distinguishes
weak from non-weak), which is a real, visible difference from what the
old `strengths.theory`-bound code would have shown ("Good") — confirming
the binding fix genuinely changes behavior, not just a coincidental
no-op in the all-correct case.

**Not yet verified:** whether `strengths.chords`'s current derivation
(a coarse weak/non-weak split reusing the same overall theory score,
rather than an independently-scored chord-specific question) is the
*right* long-term signal — that's a product question beyond this
ticket's scope, which is specifically fixing the row to display the
field that was already computed and intended for it.
