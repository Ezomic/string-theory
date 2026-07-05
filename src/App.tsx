import { Route, Routes } from 'react-router-dom'
import { FoundationsDebugPage } from './pages/FoundationsDebugPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<FoundationsDebugPage />} />
    </Routes>
  )
}

export default App
