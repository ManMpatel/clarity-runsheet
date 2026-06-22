import { create } from 'zustand'
import { registerForPushNotifications } from '../lib/notifications'
import * as SecureStore from 'expo-secure-store'
import api from '../lib/api'

export const useAuthStore = create((set) => ({
  user:    null,
  token:   null,
  loading: true,

  init: async () => {
    try {
      const token   = await SecureStore.getItemAsync('token')
      const userStr = await SecureStore.getItemAsync('user')
      if (token && userStr) {
        set({ user: JSON.parse(userStr), token, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { token, user } = res.data
    await SecureStore.setItemAsync('token', token)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    set({ user, token })
    registerForPushNotifications().catch(console.warn)
    return user
  },

  googleLogin: async (idToken) => {
    const res = await api.post('/api/auth/google/mobile', { idToken })
    const { token, user } = res.data
    await SecureStore.setItemAsync('token', token)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    set({ user, token })
    registerForPushNotifications().catch(console.warn)
    return user
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('user')
    set({ user: null, token: null })
  },
}))