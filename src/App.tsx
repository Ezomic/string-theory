import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { TabsLayout } from './components/TabsLayout'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { FoundationsDebugPage } from './pages/FoundationsDebugPage'
import { FretboardExplorerPage } from './pages/fretboard/FretboardExplorerPage'
import { QuizPage } from './pages/fretboard/QuizPage'
import { ToolsPage } from './pages/ToolsPage'
import { TunerPage } from './pages/tuner/TunerPage'
import { TuningPickerPage } from './pages/tuner/TuningPickerPage'
import { useInstrumentStore } from './store/instrumentStore'

function App() {
  const hydrate = useInstrumentStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <Routes>
      <Route element={<TabsLayout />}>
        <Route
          path="/"
          element={
            <ComingSoonPage
              title="Home"
              icon="🏠"
              body="Onboarding, streaks, and your next lesson land here in Milestone 4."
            />
          }
        />
        <Route
          path="/path"
          element={
            <ComingSoonPage
              title="Path"
              icon="🧭"
              body="The structured lesson path arrives in Milestone 4."
            />
          }
        />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/tools/tuner" element={<TunerPage />} />
        <Route path="/tools/fretboard" element={<FretboardExplorerPage />} />
        <Route
          path="/progress"
          element={
            <ComingSoonPage
              title="Progress"
              icon="📈"
              body="Streaks, heatmap, and skill mastery arrive in Milestone 6."
            />
          }
        />
      </Route>
      <Route path="/tools/tuner/tunings" element={<TuningPickerPage />} />
      <Route path="/tools/fretboard/quiz" element={<QuizPage />} />
      <Route path="/debug" element={<FoundationsDebugPage />} />
    </Routes>
  )
}

export default App
