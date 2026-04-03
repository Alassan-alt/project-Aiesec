import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminPage } from './mysterybox/pages/AdminPage'
import { BoxPage } from './mysterybox/pages/BoxPage'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/box/:token" element={<BoxPage />} />
        <Route
          path="*"
          element={<Navigate to="/admin" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
