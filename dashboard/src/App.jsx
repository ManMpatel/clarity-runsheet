import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LiveMap from './pages/LiveMap'
import TripsHistory from './pages/TripsHistory'
import DriverBehaviour from './pages/DriverBehaviour'
import VehicleHealth from './pages/VehicleHealth'
import Maintenance from './pages/Maintenance'
import GeofenceManager from './pages/GeofenceManager'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import FbtLogbook from './pages/FbtLogbook'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to='/login' replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path='/login' element={<Login />} />
      <Route
        path='/'
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to='/dashboard' replace />} />
        <Route path='dashboard'         element={<Dashboard />} />
        <Route path='live-map'          element={<LiveMap />} />
        <Route path='trips'             element={<TripsHistory />} />
        <Route path='driver-behaviour'  element={<DriverBehaviour />} />
        <Route path='vehicle-health'    element={<VehicleHealth />} />
        <Route path='maintenance'       element={<Maintenance />} />
        <Route path='geofences'         element={<GeofenceManager />} />
        <Route path='alerts'            element={<Alerts />} />
        <Route path='reports'           element={<Reports />} />
        <Route path='fbt'               element={<FbtLogbook />} />
        <Route path='settings'          element={<Settings />} />
      </Route>
    </Routes>
  )
}