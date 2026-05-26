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
import AdminShell from './components/layout/AdminShell'
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
import GoogleAuthSuccess from './pages/GoogleAuthSuccess'
import VerifyEmail from './pages/VerifyEmail'
import AdminTickets from './pages/admin/AdminTickets'
import AdminDevices from './pages/admin/AdminDevices'
import LockedFeature from './pages/LockedFeature'
import { useEffect, useState } from 'react'
import api from './lib/api'

function TierGate({ tier, children }) {
  const [access, setAccess] = useState(null)

  useEffect(() => {
    api.get('/api/vehicles').then(res => {
      const v = res.data
      if (tier === 'mid') setAccess(v.some(x => x.tier === 'mid' || x.tier === 'top'))
      if (tier === 'top') setAccess(v.some(x => x.tier === 'top'))
    }).catch(() => setAccess(false))
  }, [tier])

  if (access === null) return null
  if (!access) return <LockedFeature plan={tier === 'mid' ? 'Mid' : 'Top'} />
  return children
}

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to='/login' replace />
  return children
}

function SuperAdminRoute({ children }) {
  const adminToken = localStorage.getItem('adminToken')
  if (!adminToken) return <Navigate to='/admin/login' replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path='/login'                    element={<Login />} />
      <Route path='/signup'                   element={<Signup />} />
      <Route path='/auth/google/success'      element={<GoogleAuthSuccess />} />
      <Route path='/verify-email'  element={<VerifyEmail />} />
      <Route path='/admin/login'   element={<AdminLogin />} />
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
        <Route path='driver-behaviour' element={<TierGate tier='mid'><DriverBehaviour /></TierGate>} />
        <Route path='vehicle-health'   element={<TierGate tier='top'><VehicleHealth /></TierGate>} />
        <Route path='maintenance'      element={<TierGate tier='mid'><Maintenance /></TierGate>} />
        <Route path='geofences'        element={<TierGate tier='mid'><GeofenceManager /></TierGate>} />
        <Route path='garage/register-device' element={<RegisterDevice />} />
        <Route path='alerts'           element={<Alerts />} />
        <Route path='reports'          element={<TierGate tier='top'><Reports /></TierGate>} />
        <Route path='fbt'              element={<TierGate tier='mid'><FbtLogbook /></TierGate>} />
        <Route path='settings'         element={<Settings />} />
        <Route path='garage/my-devices' element={<MyDevices />} />
        <Route path='/admin/login' element={<AdminLogin />} />
        <Route path='billing'          element={<Billing />} />

      </Route>

      <Route path='/admin' element={<SuperAdminRoute><AdminShell /></SuperAdminRoute>}>
      <Route index element={<AdminPanel />} />
      <Route path='tickets' element={<AdminTickets />} />
      <Route path='devices' element={<AdminDevices />} />
    </Route>
    </Routes>
  )
}


