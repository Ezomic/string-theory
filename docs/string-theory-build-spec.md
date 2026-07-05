# String Theory — Build Spec

*The document you hand to Claude Code to build the app. Pairs with the product plan (`music-learning-app-plan.md`) and the visual screens (`string-theory-screens.html`).*

Version 1 · July 2026 · Author: Robbin

---

## How to use this document

This spec is organized so you can build **one section at a time**. Each screen has an ID (A1, F2, etc.) that matches the visual mockup exactly, so you can tell Claude Code "build screen F1 — the guitar tuner" and it has both the picture and the written contract.

Read order: skim §1–§5 once to understand the shared foundations (they're reused everywhere), then work section by section through §6 following the build order in §7. The three foundational pieces — the **pitch-detection engine** (§3), the **data model** (§4), and the **design system** (§5) — are dependencies of almost every screen, so build them first as described in §7's Milestone 0.

Conventions used below: **In** = data/props the screen needs; **Out** = events/data it produces; **States** = the distinct visual/logic states the screen can be in; **Edge** = edge cases and failure modes to handle.

---

## 1. Product summary

String Theory teaches music theory, guitar, and bass by making the learner understand every concept four ways: **read it, see it on the fretboard, hear it, then play it while the app listens.** It has two front doors — a structured **Path** (unlocking lessons) and a **Toolbox** (tuner, fretboard, ear training, play-and-feedback) — over one shared engine. It targets a player who already plays a bit and wants to get serious, so a placement check calibrates the starting level instead of forcing beginner content. Full rationale lives in the product plan.

---

## 2. Architecture & tech stack

**Strategy: one mic-capable web app, installable as a PWA, wrappable later.** One codebase serves desktop (any browser), mobile (phone browser + installable), and — via a later Capacitor/Tauri wrap — native app stores. This keeps every feature shipping to all three targets at once, which matters given the build-with-Claude-Code approach.

Recommended stack (all swappable, but this is the sane default):

| Layer | Choice | Why |
|---|---|---|
| Framework | React + TypeScript + Vite | Fast dev, huge ecosystem, easy PWA setup |
| Styling | CSS variables + a light utility layer (or Tailwind) | The mockup already uses CSS-variable tokens — carry them over verbatim |
| State | Zustand (or React context + reducer) | Simple global state for user/progress/audio |
| Audio | Web Audio API (`AudioContext`, `AnalyserNode`, `getUserMedia`) | Native, no dependency, works on all target browsers |
| Pitch detection | Custom module using autocorrelation/YIN (see §3) | Small, well-understood, no heavyweight lib needed |
| Audio playback | Web Audio oscillators + short sampled notes, or Tone.js | For ear-training and "hear it" steps |
| Fretboard | Reusable SVG component (see §5.4) | Data-driven, one component for every fretboard in the app |
| Persistence | IndexedDB (via `idb`) locally; optional account sync later | Progress survives offline; syncs when signed in |
| Routing | React Router | Standard |
| PWA | Vite PWA plugin (service worker + manifest) | Installable, offline-capable |

**Privacy stance to bake in:** microphone audio is processed on-device and never uploaded. State this in the mic-permission screen (A4) and settings.

**Cross-platform mic caveat to validate in Milestone 0:** iOS Safari requires a user gesture to start `AudioContext`, and mobile browsers vary in mic latency. The tuner is deliberately first partly to shake this out early.

---

## 3. The pitch-detection core (the spine)

Three features — tuner, ear-training call-and-response, and play-and-feedback — are the same capability: **turn live mic audio into "what note, how many cents off."** Build this once as a standalone module; everything else consumes it.

**Module: `pitchEngine`**

Responsibilities:
- Request mic access via `getUserMedia({ audio: true })`; expose permission state (`prompt` / `granted` / `denied`).
- Create an `AudioContext` + `AnalyserNode`; pull time-domain samples in an animation loop.
- Run a pitch-detection algorithm (autocorrelation or YIN) on each buffer → fundamental frequency in Hz.
- Convert Hz → nearest note name + octave + cents deviation, using a configurable reference pitch (A = 440 Hz default; adjustable per K1 settings).
- Smooth/debounce output (median over a short window) so the needle doesn't jitter; report a confidence value and suppress output below a noise floor.

Public API (illustrative):
```
pitchEngine.start()            // begins listening, resolves permission
pitchEngine.stop()
pitchEngine.onPitch(cb)        // cb({ hz, note:'A', octave:2, cents:-3, confidence:0.9 })
pitchEngine.setReference(440)
pitchEngine.permissionState    // 'prompt' | 'granted' | 'denied'
```

Consumers:
- **Tuner (F1–F3):** compare detected note to target string; drive needle + cents.
- **Play & feedback (E4, I2, I3):** match detected note against an expected note sequence; grade clean/flat/sharp + timing.
- **Ear training (H):** optional "play it back" drills verify the user's sung/played answer.

**Note-detection helpers** (pure functions, no audio): `hzToNote(hz, ref)`, `noteToHz(note, ref)`, `centsBetween(hz, targetHz)`. Unit-test these thoroughly — they're the correctness core.

---

## 4. Data model

Local-first (IndexedDB), optionally synced when signed in. Core entities:

**User / profile**
`id, name, email?, isGuest, createdAt, plan('free'|'pro')`

**InstrumentConfig** (per user, can hold both)
`instrument('guitar'|'bass'), stringCount(4|5|6), tuning(noteArray e.g. ['E','A','D','G','B','E']), tuningPreset('standard'|'dropD'|...), leftHanded(bool), referencePitch(440)`

**Placement result**
`level(int), strengths({ear, theory, fretboard, chords}), takenAt`

**Curriculum** (static content, shipped with app or fetched)
`Unit { id, title, order, level }`
`Lesson { id, unitId, order, title, concept, loopSteps:[read,see,hear,play], fretboardData, audioData, unlockRule }`

**Progress**
`LessonProgress { lessonId, status('locked'|'available'|'in_progress'|'done'), score, notesCleanPct, completedAt }`
`SkillProgress { skillKey('intervals'|'fretboardNotes'|'majorScales'|'chordTones'|...), masteryPct, perStringBreakdown? }`
`Streak { current, longest, lastPracticeDate }`
`Achievement { key, earnedAt? }`

**Drills / sessions** (for ear training + play-feedback history)
`DrillResult { type, level, correct, total, streak, timestamp }`
`PlayRun { exerciseId, notes:[{name, result('clean'|'sharp'|'flat'|'missed'), cents}], timingPct, score, timestamp }`
`PracticeSession { date, minutes, activities[] }` — powers the heatmap.

**Settings** — mostly derived from InstrumentConfig + a few app prefs: `notationLabels('names'|'degrees'|'solfege'), theme('dark'|'light'), reminderOn, micDeviceId, syncEnabled`.

---

## 5. Design system

Carry the mockup's tokens over unchanged — the visual language is already decided.

### 5.1 Color tokens
```
--bg:#0b0c12  --panel:#12141d  --surface:#1a1d28  --surface2:#232634
--border:#2e3242  --border-soft:#242838
--text:#eceef6  --muted:#9498aa  --faint:#61667a
--accent:#7c5cff (violet)   --accent2:#ff9e57 (amber/root)
--good:#33d6a6 (in tune)  --warn:#ffcf5c (off pitch)  --bad:#ff6b6b (error)
```
Semantic roles: **accent/violet** = interactive/primary + generic scale tones; **amber** = the *root* note and "attention" accents; **green** = in-tune/correct/mastered; **yellow** = off-pitch/shaky; **red** = errors/destructive.

### 5.2 Typography & shape
System font stack. Large bold display for the tuner note (~74px). Rounded corners: cards 18px, buttons 13px, pills 999px, phone-scale radii. Dark theme is default; a light theme is a settings option (build dark first).

### 5.3 Shared components (build as a small library)
- `Card`, `Pill` (variants: default/accent/good/warn), `Button` (primary/ghost/warn), `Segmented` (the guitar/bass toggle), `Toggle`, `RadioOption`, `StatTile`, `AppBar`, `BottomNav`, `ProgressBar`, `SectionLabel`.
- `NoteChip` — the small note squares in the play/hear rows, with states clean/sharp/flat/now/idle.
- `TunerMeter` — the needle + cents scale; input is cents deviation, color shifts good→warn.
- `PlayButton` — the round audio-play control.
- `Heatmap` — the 7-column practice calendar; input is per-day intensity 0–3.

### 5.4 The Fretboard component (important — reused everywhere)
One data-driven SVG component powers E2, G1, G2, G3, and lesson diagrams. Props:
```
<Fretboard
  instrument='guitar'|'bass'      // sets default string count/tuning
  tuning={['E','A','D','G','B','E']}
  frets={0..N}                    // visible fret range
  markers={[{string, fret, label, role:'root'|'scale'|'chord'|'interval'|'correct'|'ghost'}]}
  labelMode='names'|'degrees'|'intervals'|'none'
  leftHanded={bool}
  onFretTap={(string,fret)=>...}  // for quiz mode
/>
```
Roles map to colors: `root`→amber, `scale`/`chord`→violet, `correct`→green, `ghost`→faded violet (for quiz hints). This single component must handle 4/5/6 strings and left-handed mirroring.

### 5.5 Navigation
Bottom tab bar with four tabs: **Home, Path, Tools, Progress.** The Toolbox (tuner/fretboard/ear/play) lives under the Tools tab. Lesson flow, placement, and onboarding are full-screen modal flows without the tab bar.

---

## 6. Screen-by-screen spec

All 36 screens, grouped by section. IDs match the visual mockup.

### Section A — Onboarding & Account

**A1 · Splash**
Brand moment on cold launch. *In:* app-ready flag. *Out:* routes to onboarding (first run) or Home (returning). *States:* loading. *Edge:* keep under ~1.5s; don't block on network.

**A2 · Instrument & experience**
Pick instrument (guitar/bass/both) and self-rated experience. Seeds `InstrumentConfig` and biases the placement start. *In:* none. *Out:* instrument choice, experience level. *States:* selection made / not. *Edge:* "Both" means store two configs and let user switch later.

**A3 · Sign up / Log in**
Optional account for cross-device sync; guest path allowed. *In:* none. *Out:* account created / social auth / skipped-as-guest. *States:* empty, validating, error (email taken/invalid), success. *Edge:* guest mode fully functional; offer account later from K2.

**A4 · Mic permission (pre-prompt)**
Explains *why* before firing the OS prompt (raises grant rate). *Out:* triggers `pitchEngine.start()` → OS prompt. *States:* intro → requesting. *Edge:* must be behind a user gesture (iOS). Copy must promise on-device processing.

**A5 · Mic denied — fallback**
Shown when permission is `denied`. Explains what still works (theory, fretboard, ear-playback) and how to re-enable. *In:* permissionState. *Out:* deep-link to OS settings / continue without mic. *Edge:* every mic-dependent screen must gracefully route here or show an inline "mic off" affordance.

### Section B — Placement Check

**B1 · Placement intro**
Low-pressure framing; skippable. *Out:* start / skip. *Edge:* if skipped, default to a mid Path start based on A2 experience.

**B2 · Theory question**
Multiple-choice theory item with progress bar. *In:* question set. *Out:* answer, advance. *States:* unanswered, answered (correct/incorrect highlight), last-question. *Edge:* allow "not sure/skip."

**B3 · Ear question**
Same shell as B2 but plays audio (uses playback, not mic). *In:* audio clip + choices. *Out:* answer. *Edge:* replay button; works even if mic denied.

**B4 · Placement result**
Computes starting `level` + per-domain strengths; writes `Placement`. *In:* all answers. *Out:* level, strengths → routes to Path. *States:* computing → result. *Edge:* re-takeable from settings (K1).

### Section C — Home & Daily

**C1 · Home**
The hub: greeting, streak/level/unit stat row, "Continue the Path" hero (next lesson), and the Toolbox grid. *In:* streak, current lesson, skill hints. *Out:* navigations. *States:* has-next-lesson vs. unit-complete; first-run (see K3 empty state). *Edge:* if lessons not started, hero becomes "Start your first lesson."

**C2 · Daily mix**
A generated ~10-min session blending a warm-up tune, the user's weak-spot drill, an ear drill, and a play exercise. *In:* SkillProgress (to pick weak spots), config. *Out:* steps through each activity, marks progress. *States:* per-step done/current/upcoming. *Edge:* skip a step; resume mid-mix.

### Section D — The Path

**D1 · Path overview**
Vertical list of units → lessons with `locked/available/in_progress/done` states and per-unit completion. *In:* Curriculum + LessonProgress. *Out:* open a lesson. *Edge:* respect `unlockRule`; scroll to current lesson on open.

**D2 · Lesson intro**
Preview of a lesson: title, concept blurb, the four loop steps, time estimate, instrument note. *In:* Lesson. *Out:* start lesson. *Edge:* show if already completed (offer replay).

### Section E — The lesson loop

The core teaching flow. One lesson = four steps + completion. Shared chrome: step indicator (Read/See/Hear/Play), close (✕), back (←).

**E1 · Read**
Plain-language concept, may include a formula callout. *In:* lesson.concept. *Out:* advance to See. *Edge:* keep scannable; support inline note/interval styling.

**E2 · See**
The concept drawn via the `Fretboard` component, switchable guitar/bass. *In:* lesson.fretboardData. *Out:* advance to Hear. *Edge:* bass shows fewer strings; respect left-handed.

**E3 · Hear**
Plays the concept (scale/interval/chord) with slow/loop/instrument controls; NoteChip row lights in time. *In:* lesson.audioData. *Out:* advance to Play. *Edge:* pure playback — no mic needed; works if mic denied.

**E4 · Play (mic)**
User plays the concept; `pitchEngine` tracks against the expected sequence, lighting NoteChips clean as they land. *In:* expected note sequence, live pitch. *Out:* per-note results → lesson score; advance to complete. *States:* listening, note-hit, note-off, done; **mic-denied → skippable** ("I'll play later"). *Edge:* tolerance/latency tuning; allow skip without penalty.

**E5 · Lesson complete**
Reward: XP, streak bump, notes-clean stat, and what unlocked next. *In:* run results. *Out:* next lesson / back to Path; writes LessonProgress + updates streak/skills. *Edge:* handle "last lesson in unit" (celebrate unit completion).

### Section F — Tuner (build first)

**F1 · Tuner — guitar**
Live chromatic tuner: big detected note, in-tune state, `TunerMeter` needle + cents, tappable string targets, tuning label with alt-tunings entry. *In:* live pitch, config. *Out:* selected target string, open tunings picker. *States:* listening/no-signal, flat, in-tune, sharp; auto-detect vs. locked-string. *Edge:* below noise floor → "play a note"; mic-denied → route to A5.

**F2 · Tuner — bass**
Same component, bass preset (4/5 string). Demonstrates the flat/"tune up" state. *In:* live pitch, bass config. *Edge:* low B/E fundamentals are low-frequency — pitch engine must handle down to ~31 Hz for 5-string B.

**F3 · Alt tunings picker**
Preset list (Standard, Drop D, Half-step down, DADGAD, Open G…) + custom builder. *In:* current tuning. *Out:* new tuning → updates config + tuner targets. *Edge:* custom tuning validates note names; persist per instrument.

### Section G — Fretboard Explorer

**G1 · Scale view**
`Fretboard` showing a selected scale/key across the neck; instrument toggle; show-mode (scale/chord/interval); quiz entry. *In:* key, scale type, config. *Out:* change selection, launch quiz. *Edge:* root highlighted amber; label mode from settings.

**G2 · Chord view**
Chord shape + fingering dots, open/muted string indicators, prev/next chord and chord-quality variants (maj/min/7…). *In:* chord. *Out:* change chord. *Edge:* bass shows chord tones rather than strummed shapes.

**G3 · Quiz me — active**
"Tap every F on the neck" style drill: timer, score/streak, tap-to-answer on the fretboard, correct→green, reveal answers. *In:* target note, config. *Out:* taps → DrillResult (skill: fretboardNotes). *States:* prompt, partial-correct, complete, timed-out. *Edge:* per-string weak-spot tracking feeds SkillProgress.

### Section H — Ear Training

**H1 · Drill picker**
Categories (intervals, chord quality, scale recognition, progressions) each with level + accuracy + progress bar; locked drills gated by prior mastery. *In:* DrillResult history. *Out:* launch a drill. *Edge:* show unlock rules on locked items.

**H2 · Drill — active (correct)**
Play button, question prompt, answer grid; harmonic/melodic replay; streak counter; correct-answer highlight. *In:* generated question. *Out:* answer → DrillResult, advance. *Edge:* adaptive difficulty steps with streak.

**H3 · Wrong answer — teach**
On an incorrect answer, reveal the right one and a short "why" with a listen-again nudge. *In:* question + user answer. *Out:* continue. *Edge:* this corrective state is the learning moment — don't just mark wrong and move on.

### Section I — Play & Feedback

**I1 · Exercise picker**
Choose scales/arpeggios/exercises, each with last accuracy; tempo selector. *In:* exercise catalog + PlayRun history. *Out:* start a run at chosen tempo. *Edge:* "new" items have no score yet.

**I2 · Playing — live**
Live grading against the exercise's expected sequence: current note + meter, NoteChip run with clean/off/next states, legend. *In:* expected sequence, live pitch, tempo. *Out:* per-note results streaming. *States:* listening, playing, paused. *Edge:* metronome optional; handle wrong-order/missed notes; mic-denied → route to A5.

**I3 · Run results**
Summary: clean count, timing %, score, note-by-note strip, and a targeted "focus" tip on the worst note. *In:* PlayRun. *Out:* retry / back; writes PlayRun + SkillProgress. *Edge:* the focus tip should be specific (which note, how many cents off, likely cause).

### Section J — Progress

**J1 · Progress overview**
Streak/lessons/hours stat row, 4-week practice `Heatmap`, skills-mastered list. *In:* Streak, PracticeSession, SkillProgress. *Out:* open a skill (J3) / share. *Edge:* empty → K3.

**J2 · Achievements**
Badge grid, earned vs. locked, count. *In:* Achievement list. *Edge:* keep celebratory but calm — no aggressive gamification.

**J3 · Skill detail**
Drill-down for one skill (e.g., fretboard notes) with per-string/sub-area breakdown and a "drill the weak spots" CTA that deep-links to the relevant drill. *In:* SkillProgress[skill]. *Out:* launch targeted practice. *Edge:* breakdown shape varies per skill type.

### Section K — Settings, Profile & System

**K1 · Settings**
Grouped: Instrument (default, tuning, left-handed), Learning (notation labels, retake placement, reminder), Audio & mic (device, calibrate A=440), App (theme, sync). *In/Out:* reads/writes Settings + InstrumentConfig. *Edge:* "retake placement" re-enters B; calibrate feeds `pitchEngine.setReference`.

**K2 · Profile / account**
Identity, instruments, level; plan, reminders, export data, sign out. *In:* User. *Out:* account actions. *Edge:* guest sees "create account to sync"; sign-out confirms; export produces a data file.

**K3 · Empty state**
Shown on Progress (and Home hero) before any practice exists. Encourages first lesson/drill. *In:* progress-is-empty flag. *Out:* start tuner / take lesson. *Edge:* this is the true first-run Home/Progress — make sure both handle zero data.

---

## 7. Build order & milestones

**Milestone 0 — Foundations.** Project scaffold (Vite + React + TS + PWA), design-system tokens & shared components (§5), the `pitchEngine` module (§3) with unit-tested note math, the `Fretboard` component (§5.4), and the IndexedDB data layer (§4). Validate mic behavior on desktop + mobile browsers here.

**Milestone 1 — Tuner (F1–F3).** First real, useful feature; proves the pitch core end-to-end. Ship the guitar/bass/alt-tunings screens plus A4/A5 mic flows.

**Milestone 2 — Fretboard Explorer (G1–G3).** Visual backbone; exercises the `Fretboard` component and starts SkillProgress (fretboard notes).

**Milestone 3 — Ear Training (H1–H3).** Starts the Toolbox's audio-playback drills and adaptive difficulty.

**Milestone 4 — Path + Placement + Lesson loop (A1–A3, B1–B4, C1, D1–D2, E1–E5).** Ties it into a real course; onboarding and home hub land here.

**Milestone 5 — Play & Feedback (I1–I3, E4 polish).** The hardest feature, built on the mature pitch core.

**Milestone 6 — Progress, Daily mix, Profile, polish (C2, J1–J3, K1–K3).** Tracking, retention, and settings thread through and get finished.

Ship each milestone as something usable on its own — never a long wait for payoff.

---

## 8. Open questions

- Pure PWA vs. eventual native wrap, and when app stores matter.
- How much standard notation vs. tab vs. fretboard-only in lessons.
- Song / play-along library — later scope or out?
- Where practice data ultimately lives (on-device only vs. account sync) and whether there's a paid tier.
- Curriculum authoring: hand-authored lesson content vs. a content pipeline.

---

*Companion files: `music-learning-app-plan.md` (the why) · `string-theory-screens.html` (the pictures). This spec is the how.*
