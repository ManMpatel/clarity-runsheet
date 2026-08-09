import { create } from 'zustand'

// Deliberately its own tiny store rather than a useState in AppShell: both the Topbar's search
// trigger and the global keyboard shortcut need to open the same palette, and neither is an
// ancestor of the other.
export const usePaletteStore = create(set => ({
  open: false,
  setOpen: open => set({ open }),
  toggle: () => set(s => ({ open: !s.open })),
}))
