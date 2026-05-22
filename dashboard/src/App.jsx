import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import IMEICheck from './pages/garage/IMEICheck'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import RegisterDevice from './pages/garage/RegisterDevice'
import LiveMap from './pages/LiveMap'
import TripsHistory from './pages/TripsHistory'
import DriverBehaviour from './pages/DriverBehaviour'
import VehicleHealth from './pages/VehicleHealth'
import AdminLogin from './pages/admin/AdminLogin'
import Onboarding from './pages/Onboarding'
import Maintenance from './pages/Maintenance'
import GeofenceManager from './pages/GeofenceManager'
import Alerts from './pages/Alerts'
import MyDevices from './pages/garage/MyDevices'
import Reports from './pages/Reports'
import FbtLogbook from './pages/FbtLogbook'
import Settings from './pages/Settings'
import Billing from './pages/Billing'
import AdminPanel from './pages/AdminPanel'

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to='/login' replace />
  return children
}

function SuperAdminRoute({ children }) {
  const token = useAuthStore(s => s.token)
  const role  = useAuthStore(s => s.role)
  if (!token) return <Navigate to='/login' replace />
  if (role !== 'superAdmin') return <Navigate to='/dashboard' replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path='/login'       element={<Login />} />
      <Route path='/signup'      element={<Signup />} />
      <Route path='/admin/login' element={<AdminLogin />} />
      <Route path='/onboarding' element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />
      <Route
        path='/'
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
        
      >
        <Route index element={<Navigate to='/dashboard' replace />} />
        <Route path='dashboard'        element={<Dashboard />} />
        <Route path='live-map'         element={<LiveMap />} />
        <Route path='garage/imei-check' element={<IMEICheck />} />
        <Route path='trips'            element={<TripsHistory />} />
        <Route path='driver-behaviour' element={<DriverBehaviour />} />
        <Route path='vehicle-health'   element={<VehicleHealth />} />
        <Route path='maintenance'      element={<Maintenance />} />
        <Route path='geofences'        element={<GeofenceManager />} />
        <Route path='garage/register-device' element={<RegisterDevice />} />
        <Route path='alerts'           element={<Alerts />} />
        <Route path='reports'          element={<Reports />} />
        <Route path='fbt'              element={<FbtLogbook />} />
        <Route path='settings'         element={<Settings />} />
        <Route path='garage/my-devices' element={<MyDevices />} />
        <Route path='/admin/login' element={<AdminLogin />} />
        <Route path='billing'          element={<Billing />} />
        <Route
          path='admin'
          element={
            <SuperAdminRoute>
              <AdminPanel />
            </SuperAdminRoute>
          }
        />
      </Route>
    </Routes>
  )
}