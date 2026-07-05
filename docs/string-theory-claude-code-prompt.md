# Claude Code — Build Prompt for "String Theory"

**How to use this:** Create a new empty folder, drop the three reference docs into a `docs/` subfolder inside it (`music-learning-app-plan.md`, `string-theory-build-spec.md`, `string-theory-screens.html`), open Claude Code in that folder, and paste everything below the line as your first message. The prompt is self-contained enough to work even if the docs aren't there, but it builds truer with them.

---

You are building **String Theory**, a music-learning web app that teaches music theory, guitar, and bass. Build it start to finish, working in milestones and checking in with me at each milestone boundary. Read this whole prompt before writing any code.

## Reference material
If a `docs/` folder exists, read these first and treat them as the source of truth:
- `docs/music-learning-app-plan.md` — the product vision and rationale (the *why*).
- `docs/string-theory-build-spec.md` — architecture, the pitch-detection core, data model, design system, and a screen-by-screen spec for all 36 screens with IDs like A1/F2/E4 (the *how*). **This is your primary reference.**
- `docs/string-theory-screens.html` — the visual mockup of all 36 screens; open it to see the exact intended layout, and reuse its CSS variable tokens verbatim.

If the docs are missing, proceed from the summary in this prompt and ask me for anything critical.

## The product in one paragraph
Every concept is taught four ways — **read it, see it on the fretboard, hear it, then play it while the app listens via the microphone.** There are two front doors over one shared engine: a structured **Path** of unlocking lessons, and a **Toolbox** of grab-anytime tools (tuner, fretboard explorer, ear training, play-and-feedback). The target user already plays a bit, so a placement check sets the starting level. It must run on desktop and mobile from one codebase.

## Tech stack (use this unless you hit a real blocker, then ask)
- **React + TypeScript + Vite**, set up as an installable **PWA** (Vite PWA plugin: service worker + manifest).
- **Styling:** plain CSS with the design tokens below (a utility layer or Tailwind is fine, but keep the exact token values).
- **State:** Zustand (or context + reducer).
- **Audio:** Web Audio API (`AudioContext`, `AnalyserNode`, `getUserMedia`) for input; oscillators + short samples (or Tone.js) for playback.
- **Pitch detection:** a custom module using autocorrelation/YIN — no heavyweight dependency.
- **Persistence:** IndexedDB via `idb`, local-first. Account sync is a later concern; design the data layer so it can sync but don't build a backend yet.
- **Routing:** React Router. **Testing:** Vitest.

## Ground rules
1. **Work milestone by milestone** (list below). At the end of each milestone, stop, show me what runs, and wait for the go-ahead before the next one. Don't build all seven in one shot.
2. **Foundations first.** Milestone 0 builds the shared pieces everything depends on. Don't start feature screens until it's solid.
3. **The pitch-detection module is the highest-risk, highest-value piece.** Build it as a standalone, well-typed module with **unit-tested** note math (`hzToNote`, `noteToHz`, `centsBetween`). Verify it works with the real microphone on both a desktop browser and a mobile browser before building features on top of it.
4. **One reusable `Fretboard` SVG component** powers every fretboard in the app (lessons, explorer, quiz). Build it data-driven per the spec — don't hand-draw fretboards per screen.
5. **Match the mockup's visual language exactly** — same tokens, same component shapes, dark theme first. Screen IDs in your code/commits should reference the spec (e.g. a route or component note like `// F1 tuner-guitar`).
6. **Keep it accessible and gesture-safe:** `AudioContext` must start from a user gesture (iOS requirement). Every mic-dependent screen must handle the permission-denied state gracefully (screen A5) — never dead-end.
7. **Commit at each milestone** with clear messages. Keep a running `README.md` explaining how to run it and what's built.
8. **Ask before** introducing a new major dependency, changing the data model shape, or deviating from the spec's UX. Small implementation choices — just make them and note them.
9. **Privacy:** microphone audio is processed on-device only, never uploaded. Reflect this in the UI copy where the spec calls for it.

## Design tokens (carry over verbatim)
```
--bg:#0b0c12  --panel:#12141d  --surface:#1a1d28  --surface2:#232634
--border:#2e3242  --border-soft:#242838
--text:#eceef6  --muted:#9498aa  --faint:#61667a
--accent:#7c5cff   --accent2:#ff9e57
--good:#33d6a6  --warn:#ffcf5c  --bad:#ff6b6b
```
Roles: violet = interactive/primary + generic scale tones; amber = the root note & attention; green = in-tune/correct/mastered; yellow = off-pitch; red = error/destructive. Cards 18px radius, buttons 13px, pills 999px. Bottom nav has four tabs: Home, Path, Tools, Progress.

## Milestones (build in this order; each must be independently usable)

**Milestone 0 — Foundations.** Scaffold the Vite + React + TS + PWA project. Build: the design-system tokens and the shared component library (Card, Pill, Button, Segmented, Toggle, RadioOption, StatTile, AppBar, BottomNav, ProgressBar, NoteChip, TunerMeter, PlayButton, Heatmap); the **`pitchEngine`** module with unit-tested note math and a live "does the mic work" debug page; the **`Fretboard`** component (handles 4/5/6 strings, left-handed, marker roles); and the IndexedDB data layer implementing the spec's entities. *Done when:* the app runs, the debug page shows a live detected note from the mic, and the Fretboard renders arbitrary markers.

**Milestone 1 — Tuner (screens F1, F2, F3) + mic flows (A4, A5).** The first real feature; proves the pitch core end to end. Guitar and bass presets, alternate tunings picker, live needle + cents, tappable string targets, and graceful mic-denied fallback. *Done when:* I can tune a real guitar and bass with it.

**Milestone 2 — Fretboard Explorer (G1, G2, G3).** Scale view, chord view, and "quiz me" note-finding drill. Starts recording SkillProgress (fretboard notes). *Done when:* I can browse scales/chords for guitar and bass and play the quiz.

**Milestone 3 — Ear Training (H1, H2, H3).** Drill picker, active drill with adaptive difficulty, and the corrective "here's why" state on a wrong answer. Uses audio playback. *Done when:* interval and chord-quality drills work and track accuracy.

**Milestone 4 — Onboarding, Placement & the Path (A1–A3, B1–B4, C1, D1–D2, E1–E5).** Onboarding + optional account/guest, the placement check that sets a starting level, the Home hub, the Path list with locking, and the full **lesson loop** (Read → See → Hear → Play → Complete). Seed a small starter curriculum (a handful of lessons across 2–3 units) so the Path is real. *Done when:* I can go from first launch through a placement check into a working lesson that uses all four loop steps.

**Milestone 5 — Play & Feedback (I1, I2, I3).** Exercise picker, live note-by-note grading against an expected sequence, and a run-results summary with a targeted focus tip. Built on the now-mature pitch core. *Done when:* I can play a scale and get accurate per-note clean/sharp/flat feedback.

**Milestone 6 — Progress, Daily mix, Profile & polish (C2, J1–J3, K1–K3).** Progress overview with streak/heatmap/mastery, achievements, skill detail, the generated Daily mix, settings, profile, and empty states. Final accessibility and PWA-install polish. *Done when:* the app is a coherent whole with progress tracking and settings, installable to the home screen.

## Definition of done (per screen and overall)
- Matches the spec's components, states, and edge cases for that screen ID.
- Works on a phone-width and desktop-width viewport.
- No dead-ends on mic denial or empty data.
- Pitch/note math covered by passing unit tests.
- Dark theme correct against the tokens.

## Start now
Begin with **Milestone 0**. First, if `docs/` exists, read the three reference files and briefly confirm your understanding and the plan for Milestone 0. Then scaffold the project and build the foundations. Show me the running mic-debug page and the Fretboard component when Milestone 0 is done, and wait for my go-ahead before Milestone 1.