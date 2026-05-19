import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user:  null,
      companyId: null,
      role: null,
      subscriptionTier: null,

      login(token, user) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        set({
          token,
          user,
          companyId:        payload.companyId,
          role:             payload.role,
          subscriptionTier: payload.subscriptionTier,
        })
      },

      logout() {
        set({
          token:            null,
          user:             null,
          companyId:        null,
          role:             null,
          subscriptionTier: null,
        })
      },

      updateTier(tier) {
        set({ subscriptionTier: tier })
      },
    }),
    { name: 'clarity-auth' }
  )
)