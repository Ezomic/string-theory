import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { TabsLayout } from './components/TabsLayout'
import { maybeShowDailyReminder } from './lib/dailyReminder'
import { reconcileLessonProgress } from './lib/pathProgress'
import { DailyMixPage } from './pages/dailymix/DailyMixPage'
import { DrillPage } from './pages/ear/DrillPage'
import { EarTrainingPickerPage } from './pages/ear/EarTrainingPickerPage'
import { FoundationsDebugPage } from './pages/FoundationsDebugPage'
import { FretboardExplorerPage } from './pages/fretboard/FretboardExplorerPage'
import { QuizPage } from './pages/fretboard/QuizPage'
import { HomePage } from './pages/HomePage'
import { LessonIntroPage } from './pages/lesson/LessonIntroPage'
import { LessonLoopPage } from './pages/lesson/LessonLoopPage'
import { AccountPage } from './pages/onboarding/AccountPage'
import { InstrumentExperiencePage } from './pages/onboarding/InstrumentExperiencePage'
import { PlacementPage } from './pages/onboarding/PlacementPage'
import { SplashPage } from './pages/onboarding/SplashPage'
import { PathPage } from './pages/PathPage'
import { ExercisePickerPage } from './pages/play/ExercisePickerPage'
import { PlayExercisePage } from './pages/play/PlayExercisePage'
import { AchievementsPage } from './pages/progress/AchievementsPage'
import { ProfilePage } from './pages/progress/ProfilePage'
import { ProgressPage } from './pages/progress/ProgressPage'
import { SkillDetailPage } from './pages/progress/SkillDetailPage'
import { MicrophonePickerPage } from './pages/settings/MicrophonePickerPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { ToolsPage } from './pages/ToolsPage'
import { TunerPage } from './pages/tuner/TunerPage'
import { TuningPickerPage } from './pages/tuner/TuningPickerPage'
import { useAudioSettingsStore } from './store/audioSettingsStore'
import { useInstrumentStore } from './store/instrumentStore'

function App() {
  const hydrate = useInstrumentStore((state) => state.hydrate)
  const hydrateAudioSettings = useAudioSettingsStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
    hydrateAudioSettings().then(() => {
      void maybeShowDailyReminder(useAudioSettingsStore.getState().reminderOn)
    })
    void reconcileLessonProgress()
  }, [hydrate, hydrateAudioSettings])

  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/onboarding/instrument" element={<InstrumentExperiencePage />} />
      <Route path="/onboarding/account" element={<AccountPage />} />
      <Route path="/placement" element={<PlacementPage />} />

      <Route element={<TabsLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/path" element={<PathPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/tuner" element={<TunerPage />} />
        <Route path="/tools/fretboard" element={<FretboardExplorerPage />} />
        <Route path="/tools/ear" element={<EarTrainingPickerPage />} />
        <Route path="/tools/ear/drill" element={<DrillPage />} />
        <Route path="/tools/play" element={<ExercisePickerPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/progress/achievements" element={<AchievementsPage />} />
        <Route path="/progress/profile" element={<ProfilePage />} />
        <Route path="/daily-mix" element={<DailyMixPage />} />
      </Route>

      <Route path="/tools/tuner/tunings" element={<TuningPickerPage />} />
      <Route path="/tools/fretboard/quiz" element={<QuizPage />} />
      <Route path="/tools/play/:exerciseId" element={<PlayExercisePage />} />
      <Route path="/progress/skill/:skillKey" element={<SkillDetailPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/microphone" element={<MicrophonePickerPage />} />
      <Route path="/path/lesson/:lessonId" element={<LessonIntroPage />} />
      <Route path="/path/lesson/:lessonId/loop" element={<LessonLoopPage />} />
      <Route path="/debug" element={<FoundationsDebugPage />} />
    </Routes>
  )
}

export default App
