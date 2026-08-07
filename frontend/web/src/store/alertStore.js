import { create } from 'zustand'

export const useAlertStore = create((set, get) => ({
  alerts:      [],
  unreadCount: 0,

  setAlerts(alerts, unread) {
    set({ alerts, unreadCount: unread })
  },

  addAlert(alert) {
    set(state => ({
      alerts:      [alert, ...state.alerts].slice(0, 100),
      unreadCount: state.unreadCount + 1,
    }))
  },

  markRead(id) {
    set(state => ({
      alerts: state.alerts.map(a =>
        a._id === id ? { ...a, read: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },

  markAllRead() {
    set(state => ({
      alerts:      state.alerts.map(a => ({ ...a, read: true })),
      unreadCount: 0,
    }))
  },
}))