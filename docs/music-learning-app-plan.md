# Music Learning App — Product Plan

*A self-teaching companion for music theory, guitar, and bass.*

Working title: **String Theory** · Author: Robbin · Draft v1 · July 2026

---

## 1. Vision

A single app that teaches you music theory and helps you get better at guitar and bass, built around one simple idea: **every concept should be understood four ways — read it, see it on the fretboard, hear it, and play it.**

Most free tools do one thing. There's a tuner here, a fretboard diagram there, an ear-training site somewhere else, and a theory textbook that never connects to your hands. This app closes that loop. When you learn what a "perfect fifth" is, you read the explanation, watch it light up on your guitar *or* bass fretboard, hear it played, and then play it yourself while the app listens and confirms you got it. One concept, four reinforcing angles.

It's built for someone who already plays a bit and wants to get more serious — not an absolute beginner starting from note names, and not a pro. The tone is a patient practice partner, not a gamified toy.

---

## 2. Who it's for

The primary user is **you** — Robbin. That keeps the scope honest: build what actually helps you improve, not what a marketing persona wants.

Profile: plays guitar and/or bass at a hobbyist level, comfortable holding the instrument and playing some songs/chords, but wants to close the gaps — real theory understanding, knowing the whole fretboard cold, training the ear, and getting objective feedback while practicing alone.

Because it's a self-teaching tool, two things matter most: it has to **respect where you already are** (no forced beginner slog), and it has to be **genuinely useful in a real practice session** (not just a course you "complete" once).

---

## 3. The core learning loop

The thing that makes this more than four separate tools is a single reinforcing loop applied to every concept:

1. **Read** — a short, plain-language explanation of the concept.
2. **See** — the concept drawn on an interactive fretboard, switchable between guitar and bass.
3. **Hear** — the app plays it so you learn its sound (ear training).
4. **Play** — you play it; the app listens via the microphone and confirms you hit it clean, flat, or sharp (real-time feedback).

Every lesson and most drills route through some version of this loop. It's what ties theory to fretboard to ear to your actual hands.

---

## 4. The microphone is the spine

Three of the five goals — tuner, ear training, and real-time play feedback — are the **same underlying capability**: detecting pitch from live audio. Build that engine once and it powers all three.

Technically this is well-trodden: the Web Audio API captures the microphone, and a pitch-detection algorithm (YIN or autocorrelation) converts the incoming waveform into an exact frequency, which maps to a note name and how many cents sharp/flat it is. A working tuner is a one-afternoon prototype, and everything else reuses that same core.

This is why the tuner is built first — it's instantly useful *and* it de-risks the hardest technical dependency before anything is built on top of it.

---

## 5. Two ways in: Course + Toolbox

The app has one engine but two front doors, so it works whether you want structure or just want to drill.

**The Path (structured course).** A sequence of bite-sized lessons that unlock in order, so you always know the single next thing to work on. Because you already play, the Path doesn't start at note names — it starts wherever a short placement check puts you (see §6). Each lesson uses the core learning loop.

**The Toolbox (practice tools).** Grab-anything-anytime tools that need no lesson: the tuner, the fretboard explorer, and the ear-training drills. This is what you open when you just want to warm up or hammer one weak spot.

**They feed each other.** The Path can hand you off to the Toolbox ("you struggled with fifths — go run the interval drill"), and the Toolbox can nudge you back to the Path ("ready for the next lesson?"). Same underlying content, two moods of use.

---

## 6. Placement check

Since you already play, forcing you through beginner theory would waste your time and kill motivation. On first run (and re-takeable any time), a short **placement check** calibrates where the Path begins:

- A handful of quick theory questions (name this interval, what's the relative minor of G, etc.).
- A couple of "play this" / "name this by ear" tasks that use the mic and audio playback.

The result sets your starting altitude on the Path and the initial difficulty of the fretboard and ear drills, so everything ramps from a realistic point instead of from zero.

---

## 7. Feature set

### 7.1 Tuner (build first)
- Chromatic tuner with a clean needle/meter display and cents-off readout.
- Presets for guitar (E A D G B E) and bass (E A D G), 4- and 5-string bass.
- Alternate tunings: drop D, half-step down, DADGAD, custom.
- Big, glanceable UI usable while the instrument is in your hands.

### 7.2 Interactive fretboard explorer
- Toggle guitar ↔ bass; choose number of strings and tuning.
- Overlay scales, chords, intervals, and keys — see them light up across the neck.
- Show note names, scale degrees, or intervals as labels.
- "Quiz me" mode: app names a note, you tap where it is (and vice versa).
- Left-handed option.

### 7.3 Ear training drills
- Interval recognition (hear two notes → name the interval).
- Chord quality (major / minor / diminished / augmented, then 7ths).
- Scale and progression recognition as you advance.
- Play-back / call-and-response drills that use the mic.
- Difficulty scales with your progress.

### 7.4 Structured Path (course)
- Ordered, unlocking lessons grouped into levels/units.
- Each lesson runs the read → see → hear → play loop.
- Starts from your placement result; always surfaces the next step.

### 7.5 Practice-with-feedback (most advanced)
- Pick a scale, arpeggio, or exercise; play it; the app listens and marks which notes were clean vs. flat/sharp, and your timing.
- Sits directly on top of the tuner's pitch-detection core.

### 7.6 Progress tracking
- Streaks, lessons completed, skills mastered, drill accuracy over time.
- Lightweight and motivating — not a slot machine.

### 7.7 Settings
- Instrument default (guitar/bass), tuning, handedness, notation preference (note names vs. solfège), mic selection/calibration, light/dark theme.

---

## 8. Platform strategy

Goal: run on web, mobile, and desktop without building three separate apps.

**Recommended approach: one mic-capable web app, installable as a PWA.**
- Runs in any browser → desktop (Mac/Windows/Linux) covered instantly.
- Runs in the phone's browser → mobile covered, including mic access for tuner/feedback.
- Installable to the home screen / dock as a Progressive Web App, so it feels like a native app.
- Later, if app-store presence matters, the same codebase can be wrapped (e.g. Capacitor/Tauri) into packaged mobile and desktop apps.

This keeps us on **one codebase**, which matters a lot given the build-it-with-Claude-Code approach — every feature ships to all three platforms at once. The main thing to validate early is microphone behavior on mobile browsers, which the tuner prototype will confirm.

*Decision still open:* pure PWA vs. eventual native wrap. We don't have to decide now — the web-first path doesn't close any doors.

---

## 9. Suggested build order

Each step is independently useful, so there's never a long wait for a payoff:

1. **Tuner** (guitar + bass) — instantly useful; proves the mic + pitch-detection core.
2. **Interactive fretboard** — the visual backbone for theory; no audio risk.
3. **Ear training drills** — starts the Toolbox; reuses audio playback.
4. **Structured Path + placement check** — ties the pieces into a real course.
5. **Play-and-get-feedback** — the hardest and coolest; built on the tuner's core.

Progress tracking, settings, and polish thread through as the pieces land.

---

## 10. Guiding principles

- **Respect the player.** Meet Robbin where he is; never condescend or force beginner busywork.
- **Every concept, four ways.** Read, see, hear, play — the loop is the product.
- **Useful in a real practice session,** not just a course to finish once.
- **One core, many features.** The pitch-detection engine is built once and reused everywhere.
- **One codebase, every platform.** Web-first keeps all three targets in sync.
- **Calm, not gamified.** Motivating feedback without turning practice into a casino.

---

## 11. Open questions to revisit

- Name and visual identity (chosen: String Theory).
- Pure PWA vs. native wrap, and if/when app stores matter.
- Notation depth: how much standard notation vs. tab vs. fretboard-only.
- Song library / play-along — in scope later, or out?
- Where practice data lives (on-device only vs. synced across devices).

---

*Next steps: name the app, then sketch every screen.*