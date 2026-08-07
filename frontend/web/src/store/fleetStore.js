import { create } from 'zustand'

export const useFleetStore = create((set, get) => ({
  vans: {},

  updateVan(data) {
    set(state => ({
      vans: {
        ...state.vans,
        [data.imei]: {
          ...state.vans[data.imei],
          ...data,
          updatedAt: Date.now(),
        }
      }
    }))
  },

  setFleet(vanArray) {
    const vans = {}
    for (const item of vanArray) {
      if (item.vehicle?.imei) {
        vans[item.vehicle.imei] = {
          ...item.vehicle,
          ...item.state,
        }
      }
    }
    set({ vans })
  },

  getVan(imei) {
    return get().vans[imei] || null
  },

  getAllVans() {
    return Object.values(get().vans)
  },
}))
