# String Theory — Claude Code Build Prompt (local setup)

**Setup is already done for you.** This file and its `docs/` folder live together in
`Documents/Drive/String Theory App/`. The reference material is already in `./docs`:

- `docs/music-learning-app-plan.md` — product vision (the *why*)
- `docs/string-theory-build-spec.md` — the primary technical spec (the *how*)
- `docs/string-theory-screens.html` — visual mockup of all 36 screens
- `docs/string-theory-case-study.html` — portfolio case study (visual reference)

**To start:** open Claude Code in this folder (`Documents/Drive/String Theory App/`) and paste
the short prompt below — or just tell it: *"Read this whole folder including ./docs and follow
BUILD-PROMPT.md."*

---

## Short prompt to paste

```
Build the app described in this folder. Read ./docs/string-theory-build-spec.md first (the
primary spec), with ./docs/music-learning-app-plan.md for context and ./docs/string-theory-screens.html
for the exact intended visuals. Then follow the full brief below. Work milestone by milestone
and check in with me at each milestone boundary. Begin now with Milestone 0.
```

---

## Full brief

You are building **String Theory**, a music-learning web app that teaches music theory, guitar, and bass. Build it start to finish, working in milestones and checking in with me at each milestone boundary. Read this whole brief and the `docs/` before writing any code.

### The product in one paragraph
Every concept is taught four ways — **read it, see it on the fretboard, hear it, then play it while the app listens via the microphone.** There are two front doors over one shared engine: a structured **Path** of unlocking lessons, and a **Toolbox** of grab-anytime tools (tuner, fretboard explorer, ear training, play-and-feedback). The target user already plays a bit, so a placement check sets the starting level. It must run on desktop and mobile from one codebase.

### Tech stack (use this unless you hit a real blocker, then ask)
- **React + TypeScript + Vite**, set up as an installable **PWA** (Vite PWA plugin: service worker + manifest).
- **Styling:** plain CSS with the design tokens below (a utility layer or Tailwind is fine, but keep the exact token values).
- **State:** Zustand (or context + reducer).
- **Audio:** Web Audio API (`AudioContext`, `AnalyserNode`, `getUserMedia`) for input; oscillators + short samples (or Tone.js) for playback.
- **Pitch detection:** a custom module using autocorrelation/YIN — no heavyweight dependency.
- **Persistence:** IndexedDB via `idb`, local-first. Design the data layer so it *can* sync later, but don't build a backend yet.
- **Routing:** React Router. **Testing:** Vitest.

### Ground rules
1. **Work milestone by milestone** (below). At the end of each, stop, show me what runs, and wait for the go-ahead. Don't build all seven at once.
2. **Foundations first.** Milestone 0 builds the shared pieces everything depends on. No feature screens until it's solid.
3. **The pitch-detection module is the highest-risk, highest-value piece.** Standalone, well-typed, with **unit-tested** note math (`hzToNote`, `noteToHz`, `centsBetween`). Verify it against a real mic on desktop and mobile before building on it.
4. **One reusable `Fretboard` SVG component** powers every fretboard (lessons, explorer, quiz). Data-driven per the spec — don't hand-draw per screen.
5. **Match the mockup's visual language exactly** — same tokens, same component shapes, dark theme first. Reference screen IDs from the spec in code (e.g. `// F1 tuner-guitar`).
6. **Gesture-safe & accessible:** `AudioContext` must start from a user gesture (iOS). Every mic-dependent screen handles permission-denied gracefully (screen A5) — never dead-end.
7. **Commit at each milestone** with clear messages. Keep a running `README.md`.
8. **Ask before** a new major dependency, a data-model change, or a UX deviation from the spec. Small choices — just make them and note them.
9. **Privacy:** mic audio is processed on-device only, never uploaded. Reflect this in UI copy where the spec calls for it.

### Design tokens (carry over verbatim)
```
--bg:#0b0c12  --panel:#12141d  --surface:#1a1d28  --surface2:#232634
--border:#2e3242  --border-soft:#242838
--text:#eceef6  --muted:#9498aa  --faint:#61667a
--accent:#7c5cff   --accent2:#ff9e57
--good:#33d6a6  --warn:#ffcf5c  --bad:#ff6b6b
```
Roles: violet = interactive/primary + generic scale tones; amber = root note & attention; green = in-tune/correct/mastered; yellow = off-pitch; red = error/destructive. Cards 18px radius, buttons 13px, pills 999px. Bottom nav: Home, Path, Tools, Progress.

### Milestones (build in order; each independently usable)

**Milestone 0 — Foundations.** Scaffold Vite + React + TS + PWA. Build: design tokens + shared component library (Card, Pill, Button, Segmented, Toggle, RadioOption, StatTile, AppBar, BottomNav, ProgressBar, NoteChip, TunerMeter, PlayButton, Heatmap); the **`pitchEngine`** module with unit-tested note math + a live mic-debug page; the **`Fretboard`** component (4/5/6 strings, left-handed, marker roles); and the IndexedDB data layer (spec's entities). *Done when:* app runs, debug page shows a live detected note, Fretboard renders arbitrary markers.

**Milestone 1 — Tuner (F1, F2, F3) + mic flows (A4, A5).** First real feature; proves the pitch core. Guitar/bass presets, alt-tunings picker, live needle + cents, string targets, graceful mic-denied fallback. *Done when:* I can tune a real guitar and bass.

**Milestone 2 — Fretboard Explorer (G1, G2, G3).** Scale view, chord view, quiz-me drill; starts SkillProgress (fretboard notes). *Done when:* I can browse scales/chords for both instruments and play the quiz.

**Milestone 3 — Ear Training (H1, H2, H3).** Drill picker, active drill with adaptive difficulty, corrective "here's why" wrong-answer state. *Done when:* interval + chord-quality drills work and track accuracy.

**Milestone 4 — Onboarding, Placement & Path (A1–A3, B1–B4, C1, D1–D2, E1–E5).** Onboarding + guest/account, placement check, Home hub, Path with locking, and the full lesson loop (Read → See → Hear → Play → Complete). Seed a small starter curriculum (a few lessons across 2–3 units). *Done when:* first launch → placement → a working lesson using all four loop steps.

**Milestone 5 — Play & Feedback (I1, I2, I3).** Exercise picker, live note-by-note grading vs. an expected sequence, run-results summary with a targeted focus tip. *Done when:* I can play a scale and get accurate per-note clean/sharp/flat feedback.

**Milestone 6 — Progress, Daily mix, Profile & polish (C2, J1–J3, K1–K3).** Progress overview (streak/heatmap/mastery), achievements, skill detail, generated Daily mix, settings, profile, empty states. Final a11y + PWA-install polish. *Done when:* coherent whole, installable to home screen.

### Definition of done (per screen & overall)
- Matches the spec's components, states, and edge cases for that screen ID.
- Works at phone-width and desktop-width.
- No dead-ends on mic denial or empty data.
- Pitch/note math covered by passing unit tests.
- Dark theme correct against the tokens.

### Start now
Begin with **Milestone 0**. First read the three `docs/` files and briefly confirm your understanding + the Milestone 0 plan. Then scaffold and build the foundations. Show me the running mic-debug page and the Fretboard component when Milestone 0 is done, and wait for my go-ahead before Milestone 1.
