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

// {locked:0, entry:1, mid:2, top:3} — mirrors frontend/web/src/components/layout/nav-config.js's
// hasTier(), which itself mirrors the backend's requireTier ranking (auth-guard.ts). Kept here
// (not a shared package — see lib/pricing.js's same comment) so mobile's tier gates
// (components/ui/TierGate.js) show/hide the exact same screens the API will actually allow.
const TIER_LEVELS = { locked: 0, entry: 1, mid: 2, top: 3 }

// Every login path (password, Google, cold-start refresh) needs the same four claims pulled off
// the same JWT payload — factored out so a fifth claim never gets added to three of the four call
// sites and forgotten in the last one.
function claimsFromToken(accessToken) {
  const payload = decodeJwt(accessToken)
  return {
    companyId: payload.companyId || null,
    role: payload.role || null,
    subscriptionTier: payload.subscriptionTier || null,
    accountType: payload.accountType || null,
  }
}

export const useAuthStore = create((set, get) => ({
  user:    null,
  loading: true,

  // Populated from the decoded access token so screens can read companyId/role without each
  // one re-decoding the JWT themselves (used by hooks/useSocket.js, for one).
  companyId: null,
  role:      null,
  subscriptionTier: null,
  accountType:      null,

  hasTier: (minTier) => (TIER_LEVELS[get().subscriptionTier || 'entry'] || 0) >= (TIER_LEVELS[minTier] || 0),

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

      set({ user, ...claimsFromToken(accessToken), loading: false })
    } catch {
      clearAccessToken()
      await setRefreshToken(null)
      await SecureStore.deleteItemAsync(USER_KEY)
      set({ user: null, companyId: null, role: null, subscriptionTier: null, accountType: null, loading: false })
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user } = res.data

    setAccessToken(accessToken)
    await setRefreshToken(refreshToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))

    set({ user, ...claimsFromToken(accessToken) })

    registerForPushNotifications().catch(console.warn)
    return user
  },

  googleLogin: async (idToken) => {
    const res = await api.post('/auth/google/token', { idToken })
    const { accessToken, refreshToken, user } = res.data

    setAccessToken(accessToken)
    await setRefreshToken(refreshToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))

    set({ user, ...claimsFromToken(accessToken) })

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
    set({ user: null, companyId: null, role: null, subscriptionTier: null, accountType: null })
  },
}))

// Wired up so lib/api.js's response interceptor can force a logout after a failed silent
// refresh (revoked/expired refresh token) without importing this store directly — see the
// comment above registerLogoutHandler in lib/api.js for why.
registerLogoutHandler(() => {
  SecureStore.deleteItemAsync(USER_KEY).catch(() => {})
  useAuthStore.setState({ user: null, companyId: null, role: null, subscriptionTier: null, accountType: null })
})
