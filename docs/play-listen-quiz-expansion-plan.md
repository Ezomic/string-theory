# Play, Listen & Quiz Expansion — Plan

*Follow-up to `music-learning-app-plan.md`. Scope: fill out the exercise catalogs (Path + Toolbox) now that Units 1-4 and the Quiz step exist.*

---

## 1. Where things stand

The Path (`src/lib/curriculum.ts`) has 4 units × 5 lessons = 20 lessons, each running the full read → see → hear → **play** → **quiz** loop. The Toolbox has a standalone Play exercise picker (`src/lib/exercises.ts`) and Listen ear-training drills (`src/lib/earTraining.ts`). All three draw on the same master catalog in `src/lib/theory.ts` (11 scales, 11 chords), but none of them use all of it yet:

| | theory.ts | Play exercises | Listen drills | Curriculum (Path) |
|---|---|---|---|---|
| Scales | 11 | 6 | 4 | 8 |
| Chords | 11 | 8 | 7 | 8 |

**Play** (`src/lib/exercises.ts:43-172`, 16 entries) is missing scale exercises for majorPentatonic, harmonicMinor, lydian, locrian, melodicMinor, and chord exercises for diminished (triad), augmented, sus2. Root notes used across all 16 exercises: only A, B, C, D, E, G — 6 of 12 chromatic roots.

**Listen** (`src/lib/earTraining.ts`) scale-recognition only tests major, naturalMinor, majorPentatonic, minorPentatonic (`:70-102`) — none of the modes or harmonic/melodic minor. Chord-quality (`:48-68`) covers 7 of 11 chord types, missing sus2, sus4, dim7, m7b5. Progressions (`:120-164`) are all major-key (I-IV-V-I, I-V-vi-IV, ii-V-I, vi-IV-I-V) — no minor-key progressions.

**Quiz** (`LessonQuizStep`, `curriculum.ts:35-39`) is one hardcoded question per lesson. Replaying a lesson always shows the same question.

**Path page** (`src/pages/PathPage.tsx`) and lesson loop are fully data-driven off `UNITS`/`lessonsInUnit` — adding a unit or lesson requires no UI code changes, it renders automatically.

---

## 2. Phase 0 — Fill existing catalog gaps (data-only)

**Play** (`exercises.ts`): add the 5 missing scale exercises and 3 missing chord exercises (16 → 24 total), choosing roots from the unused set (F, F#, C#, D#, G#, A#) so root coverage stops clustering on A/B/C/D/E/G.

**Listen** (`earTraining.ts`):
- Scale recognition: add dorian, mixolydian, phrygian, lydian, locrian, harmonicMinor, melodicMinor — gate behind the existing level-unlock pattern already used for intervals/chords (e.g. modes unlock at level 2-3, harmonic/melodic minor at level 3+).
- Chord quality: add sus2, sus4, dim7, m7b5.
- Progressions: add 2-4 minor-key progressions (i–iv–v–i, i–VI–III–VII, i–iv–VII–III, ii°–v–i) alongside the current major-only set.

No new screens — `EarTrainingPickerPage` and `DrillPage` already render whatever the category/level tables contain.

## 3. Phase 1 — Quiz variety (small structural change)

Change `LessonQuizStep` from a single object to a pool of 2-4 questions per lesson; `LessonLoopPage` picks one at random each time the lesson is run. ~20 lessons × 2-4 = 40-80 questions total. No new UI — same quiz screen, just non-deterministic content.

## 4. Phase 2 — Unit 5 (new curriculum content)

Lydian, locrian, melodic minor, augmented triads, and a dedicated sus2 lesson exist in `theory.ts` but have no lesson anywhere in the Path. Proposed Unit 5 (5 lessons, same read→see→hear→play→quiz shape as Units 1-4):

1. Lydian mode
2. Locrian mode
3. Melodic minor
4. Augmented triads
5. Sus2 chords (currently only mentioned in passing in the sus4 lesson)

Because `PathPage` iterates `UNITS` and `lessonsInUnit`, this unit appears automatically once added to `curriculum.ts` — see the sketch in §6 for what it looks like once live.

## 5. Phase 3 — Depth pass (stretch, do after 0-2 land)

- More 2-octave scale variants (currently only G major is 2-octave).
- Broader root coverage overall (once Phase 0 lands, revisit which roots are still thin).
- Larger ear-training pools per category so repeated drills feel less repetitive.

---

## 6. Design notes for building

Two places need an actual design decision (not just more data rows) — sketched separately and referenced here:

- **Play exercise picker at 24 items.** A flat list per category (up to 11 items in Scales) still fits the current list pattern, but "increase root diversity" (Phase 0/3) means the same scale can now appear at multiple roots — worth a root chip filter rather than duplicating list rows per key. See sketch A.
- **Unit 5 on the Path page.** Confirms the existing card/lesson-row pattern scales to a 5th unit without changes — see sketch B.

---

## 7. Suggested ticket split

1. THI — Fill Play exercise catalog gaps (scales, chords, roots)
2. THI — Fill Listen ear-training catalog gaps (scale recognition, chord quality, minor progressions)
3. THI — Add per-lesson quiz question pools + randomization
4. THI — Add Unit 5 (Lydian, Locrian, Melodic minor, Augmented, Sus2)
5. THI (stretch) — 2-octave variants + root coverage depth pass

Each is independently shippable and doesn't depend on the others landing first.
