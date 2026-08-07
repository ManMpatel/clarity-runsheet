import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { registerForPushNotifications } from '../lib/notifications'
import { decodeJwt } from '../lib/jwt'
import api, {
  setAccessToken,
  clearAccessToken,
  getRefreshToken,
  setRefreshToken,
  registerLogoutHandler,
} from '../lib/api'

const USER_KEY = 'user'

export const useAuthStore = create((set) => ({
  user:    null,
  loading: true,

  // Populated from the decoded access token so screens can read companyId/role without each
  // one re-decoding the JWT themselves (used by HomeScreen.js's socket wiring, for one).
  companyId: null,
  role:      null,

  // On cold start there's no access token in memory (it was never persisted), only the refresh
  // token in SecureStore. Exchange it for a fresh access token immediately; if that fails
  // (expired/revoked), treat as logged out.
  init: async () => {
    try {
      const refreshToken = await getRefreshToken()
      if (!refreshToken) {
        set({ loading: false })
        return
      }

      const res = await api.post('/auth/refresh', { refreshToken })
      const { accessToken, refreshToken: newRefreshToken } = res.data

      setAccessToken(accessToken)
      if (newRefreshToken) await setRefreshToken(newRefreshToken)

      const userStr = await SecureStore.getItemAsync(USER_KEY)
      const user = userStr ? JSON.parse(userStr) : null
      const payload = decodeJwt(accessToken)

      set({
        user,
        companyId: payload.companyId || null,
        role:      payload.role || null,
        loading:   false,
      })
    } catch {
      clearAccessToken()
      await setRefreshToken(null)
      await SecureStore.deleteItemAsync(USER_KEY)
      set({ user: null, companyId: null, role: null, loading: false })
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user } = res.data

    setAccessToken(accessToken)
    await setRefreshToken(refreshToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))

    const payload = decodeJwt(accessToken)
    set({ user, companyId: payload.companyId || null, role: payload.role || null })

    registerForPushNotifications().catch(console.warn)
    return user
  },

  googleLogin: async (idToken) => {
    const res = await api.post('/auth/google/token', { idToken })
    const { accessToken, refreshToken, user } = res.data

    setAccessToken(accessToken)
    await setRefreshToken(refreshToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))

    const payload = decodeJwt(accessToken)
    set({ user, companyId: payload.companyId || null, role: payload.role || null })

    registerForPushNotifications().catch(console.warn)
    return user
  },

  logout: async () => {
    const refreshToken = await getRefreshToken()
    // Best-effort — don't block logout on the network call failing.
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {})
    }

    clearAccessToken()
    await setRefreshToken(null)
    await SecureStore.deleteItemAsync(USER_KEY)
    set({ user: null, companyId: null, role: null })
  },
}))

// Wired up so lib/api.js's response interceptor can force a logout after a failed silent
// refresh (revoked/expired refresh token) without importing this store directly — see the
// comment above registerLogoutHandler in lib/api.js for why.
registerLogoutHandler(() => {
  SecureStore.deleteItemAsync(USER_KEY).catch(() => {})
  useAuthStore.setState({ user: null, companyId: null, role: null })
})
