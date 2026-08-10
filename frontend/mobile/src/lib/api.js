import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

// EXPO_PUBLIC_* vars are inlined at build time (see app.json / eas.json for the rest of the
// app's env var conventions, e.g. EXPO_PUBLIC_MAPBOX_TOKEN used in HomeScreen.js).
const API_ROOT = process.env.EXPO_PUBLIC_API_URL || 'https://api.clarity-software.com.au'

const APP_VERSION = Constants.expoConfig?.version || '1.0.0'

const api = axios.create({
  baseURL: `${API_ROOT}/api/v1`,
  timeout: 10000,
  headers: {
    'X-Platform':    Platform.OS,
    'X-App-Version': APP_VERSION,
  },
})

// --- Access token: in-memory only ------------------------------------------------------------
// Kept out of expo-secure-store (unlike the refresh token below) to reduce exposure if the
// device is compromised — mirrors frontend/web/src/store/authStore.js's in-memory accessToken.
// Lives here (module-level), not in the zustand store, so this file doesn't need to import
// authStore.js (which itself imports this file for its own api calls — importing both ways would
// create a cycle). authStore.js calls setAccessToken()/clearAccessToken() whenever it changes.
let accessToken = null
export function setAccessToken(token) {
  accessToken = token
}
export function clearAccessToken() {
  accessToken = null
}
// Used by hooks/useSocket.js to put the current token on the socket.io handshake — the socket
// connection lives outside this module and has no other way to read it.
export function getAccessToken() {
  return accessToken
}

// --- Refresh token: persisted in SecureStore -----------------------------------------------
// Mobile has no cookie jar, so unlike web (httpOnly cookie) the refresh token has to travel in
// request/response bodies and be persisted here as the durable credential.
const REFRESH_TOKEN_KEY = 'refreshToken'

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export async function setRefreshToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    }
  } catch {}
}

// Registered by authStore.js at module load so a failed silent refresh can clear zustand state
// (and bounce the user back to the login stack, gated on `user` in navigation/index.js) without
// this file importing the store directly.
let logoutHandler = null
export function registerLogoutHandler(fn) {
  logoutHandler = fn
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Every /api/v1/* response is now {success,message,data,errors}. Unwrap `data` transparently so
// existing call sites (`const res = await api.get(...); setVehicles(res.data)`) keep working
// unchanged, matching frontend/web/src/lib/api.js's pattern.
api.interceptors.response.use((res) => {
  if (res.data && typeof res.data === 'object' && 'success' in res.data) {
    res.data = res.data.data
  }
  return res
})

let refreshPromise = null

async function silentRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken()
      if (!refreshToken) throw new Error('No refresh token stored')

      // Raw axios, not the `api` instance — avoids recursing through these same interceptors.
      const res = await axios.post(
        `${API_ROOT}/api/v1/auth/refresh`,
        { refreshToken },
        { headers: { 'X-Platform': Platform.OS, 'X-App-Version': APP_VERSION } }
      )
      const body = res.data?.data || res.data
      if (!body?.accessToken) throw new Error('Refresh response missing accessToken')

      setAccessToken(body.accessToken)
      // Refresh tokens rotate on every use — the old one is revoked server-side, so the new one
      // must always be persisted or the next refresh will fail.
      if (body.refreshToken) await setRefreshToken(body.refreshToken)

      return body.accessToken
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status
    const url = err.config?.url || ''
    // Don't try to silently refresh the refresh call itself, or auth entry points' own 401s.
    const isAuthEndpoint = url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/google/token')

    if (status === 401 && !isAuthEndpoint && !err.config?._retried) {
      try {
        const newToken = await silentRefresh()
        err.config._retried = true
        err.config.headers.Authorization = `Bearer ${newToken}`
        return api.request(err.config)
      } catch {
        clearAccessToken()
        await setRefreshToken(null)
        if (logoutHandler) logoutHandler()
      }
    }

    return Promise.reject(err)
  }
)

export default api
