import { create } from 'zustand'

const MAX_ALERTS = 100

export const useAlertStore = create((set) => ({
  alerts:      [],
  unreadCount: 0,

  setAlerts(alerts, unread) {
    set({ alerts: alerts ?? [], unreadCount: unread ?? 0 })
  },

  addAlert(alert) {
    set(state => {
      // Socket delivery and the periodic refetch both surface the same alert. Without this guard
      // the bell count drifts upward every time the two race, and the feed shows duplicate rows.
      if (alert?.id && state.alerts.some(a => a.id === alert.id)) return state
      return {
        alerts: [alert, ...state.alerts].slice(0, MAX_ALERTS),
        unreadCount: alert?.read ? state.unreadCount : state.unreadCount + 1,
      }
    })
  },

  markRead(id) {
    set(state => {
      const target = state.alerts.find(a => a.id === id)
      // Only decrement when the alert was genuinely unread — re-marking a read alert used to
      // knock the count down anyway.
      const wasUnread = target && !target.read
      return {
        alerts: state.alerts.map(a => (a.id === id ? { ...a, read: true } : a)),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    })
  },

  markAllRead() {
    set(state => ({
      alerts: state.alerts.map(a => ({ ...a, read: true })),
      unreadCount: 0,
    }))
  },
}))
