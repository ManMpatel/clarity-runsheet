import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: `${API_ROOT}/api/v1`,
  // Required for the httpOnly refresh-token cookie to be sent/received cross-origin during
  // local dev (dashboard on :5173, api on :3000).
  withCredentials: true,
  headers: { 'X-Platform': 'web' },
})

api.interceptors.request.use((config) => {
  const isAdminRoute = config.url?.includes('/admin/')
  if (isAdminRoute) {
    // Super-admin auth is a deliberately separate, short-lived (8h TOTP-gated) token realm — not
    // part of the access/refresh model above. Left as its own localStorage-backed flow rather
    // than folded into useAuthStore, since merging them would mean either giving a regular
    // company user's session the same refresh-rotation machinery as a superadmin's, or vice
    // versa, for no real benefit.
    const adminToken = localStorage.getItem('adminToken')
    if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`
  } else {
    const token = useAuthStore.getState().accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Every /api/v1/* response is now {success,message,data,errors}. Unwrap `data` transparently so
// existing call sites (`const res = await api.get(...); setVehicles(res.data)`) keep working
// unchanged — only auth endpoints, which return a differently-shaped payload than before
// (accessToken/refreshToken instead of a single token), need their call sites updated regardless.
api.interceptors.response.use((res) => {
  if (res.data && typeof res.data === 'object' && 'success' in res.data) {
    res.data = res.data.data
  }
  return res
})

let refreshPromise = null

// Exported so App can run it once on boot: the access token is memory-only (see authStore.js),
// so a page reload has no token until the refresh cookie is traded for a fresh one.
export async function silentRefresh() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_ROOT}/api/v1/auth/refresh`, {}, { withCredentials: true, headers: { 'X-Platform': 'web' } })
      .then((res) => {
        const accessToken = res.data?.data?.accessToken
        if (accessToken) useAuthStore.getState().setAccessToken(accessToken)
        return accessToken
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status
    const isAdminRoute = err.config?.url?.includes('/admin/')

    // Compatibility shim: existing pages read `err.response.data.error`, the old flat error
    // shape. Mirror the envelope's `message` into that field so those call sites (13 files, see
    // migration notes) keep working without individually touching each one.
    if (err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
      err.response.data.error = err.response.data.message
    }

    if (status === 401) {
      if (isAdminRoute) {
        const adminToken = localStorage.getItem('adminToken')
        if (adminToken) {
          localStorage.removeItem('adminToken')
          window.location.href = '/admin/login'
        }
        return Promise.reject(err)
      }

      // Don't try to silently refresh the refresh call itself, or /login's own 401s.
      const isAuthEndpoint = err.config?.url?.includes('/auth/refresh') || err.config?.url?.includes('/auth/login')
      if (!isAuthEndpoint && !err.config?._retried) {
        const newToken = await silentRefresh().catch(() => null)
        if (newToken) {
          err.config._retried = true
          err.config.headers.Authorization = `Bearer ${newToken}`
          return api.request(err.config)
        }
      }

      useAuthStore.getState().logout()
      window.location.href = '/login'
    }

    return Promise.reject(err)
  }
)

export default api
