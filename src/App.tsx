import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { RequireAuth } from './components/RequireAuth'
import { RequireRol } from './components/RequireRol'
import { Header } from './components/Header'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { OrdenesTrabajo } from './pages/OrdenesTrabajo'
import { Maestros } from './pages/Maestros'
import { Checklist } from './pages/Checklist'
import { Intervencion } from './pages/Intervencion'
import { Vehiculos } from './pages/Vehiculos'
import { VehiculoDetalle } from './pages/VehiculoDetalle'
import { Vencimientos } from './pages/Vencimientos'
import {
  ROLES_ADMINISTRATIVOS,
  ROLES_INTERVENCION,
  ROLES_MAESTROS,
  ROLES_ORDENES_TRABAJO,
  getDefaultRoute,
} from './lib/roles'

function IndexRedirect() {
  const { perfil } = useAuth()
  return <Navigate to={getDefaultRoute(perfil?.rol)} replace />
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>
        <Routes>
          <Route index element={<IndexRedirect />} />
          <Route path="checklist" element={<Checklist />} />
          <Route element={<RequireRol roles={ROLES_INTERVENCION} />}>
            <Route path="intervencion" element={<Intervencion />} />
          </Route>
          <Route element={<RequireRol roles={ROLES_ORDENES_TRABAJO} />}>
            <Route path="ordenes-trabajo" element={<OrdenesTrabajo />} />
          </Route>
          <Route element={<RequireRol roles={ROLES_ADMINISTRATIVOS} />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="vehiculos" element={<Vehiculos />} />
            <Route path="vehiculos/:id" element={<VehiculoDetalle />} />
            <Route path="vencimientos" element={<Vencimientos />} />
          </Route>
          <Route element={<RequireRol roles={ROLES_MAESTROS} />}>
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
