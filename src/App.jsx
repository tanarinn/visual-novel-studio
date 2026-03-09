import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/common/Layout'
import Home from './pages/Home'
import Settings from './pages/Settings'
import SceneEditor from './pages/SceneEditor'
import Reader from './pages/Reader'
import Export from './pages/Export'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/scenes" element={<SceneEditor />} />
          <Route path="/reader" element={<Reader />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
