import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth } from './components/RequireAuth'
import { RequireRol } from './components/RequireRol'
import { Header } from './components/Header'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Resoluciones } from './pages/Resoluciones'
import { Maestros } from './pages/Maestros'

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>
        <Routes>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route element={<RequireRol roles={['encargado', 'admin']} />}>
            <Route path="resoluciones" element={<Resoluciones />} />
          </Route>
          <Route element={<RequireRol roles={['admin']} />}>
            <Route path="maestros" element={<Maestros />} />
          </Route>
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
