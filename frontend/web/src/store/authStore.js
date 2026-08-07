import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Access token lives in memory only (not persisted) to reduce XSS exposure — the old store put
// the raw JWT in localStorage via zustand's persist, which is readable by any injected script.
// The refresh token never touches JS at all: it's delivered as an httpOnly cookie the browser
// attaches automatically, and refreshed silently by the axios interceptor in lib/api.js on a 401
// (see accessToken hydration on app boot there too, since a page reload loses the in-memory token).
export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      companyId: null,
      role: null,
      subscriptionTier: null,
      accountType: null,
      onboardingComplete: false,

      // Single source of truth for "we just got a fresh access token" — used by /login,
      // /verify-email, and the silent-refresh interceptor alike. This replaces the old store's
      // `login()` action for that purpose; kept the name `login` too (aliased below) since
      // Login.jsx / VerifyEmail.jsx / GoogleAuthSuccess.jsx already call it and there's no
      // reason to force a rename across every call site for what's the same operation.
      login(accessToken, user, onboardingComplete) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        set({
          accessToken,
          user,
          companyId: payload.companyId,
          role: payload.role,
          subscriptionTier: payload.subscriptionTier,
          accountType: payload.accountType || 'contractor',
          onboardingComplete: onboardingComplete || false,
        })
      },

      // Called only by the silent-refresh interceptor — updates just the token, leaves user/company
      // state alone.
      setAccessToken(accessToken) {
        set({ accessToken })
      },

      completeOnboarding() {
        set({ onboardingComplete: true })
      },

      logout() {
        set({
          accessToken: null,
          user: null,
          companyId: null,
          role: null,
          subscriptionTier: null,
          accountType: null,
          onboardingComplete: false,
        })
      },

      updateTier(tier) {
        set({ subscriptionTier: tier })
      },
    }),
    {
      name: 'clarity-auth',
      // accessToken deliberately excluded — see the comment above.
      partialize: (state) => ({
        user: state.user,
        companyId: state.companyId,
        role: state.role,
        subscriptionTier: state.subscriptionTier,
        accountType: state.accountType,
        onboardingComplete: state.onboardingComplete,
      }),
    }
  )
)
