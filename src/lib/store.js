import { create } from "zustand";

// UI state shared between the DOM layer and the WebGL scene.
export const useStore = create((set) => ({
  phase: "intro", // intro | ready | loading | entering | site
  setPhase: (phase) => set({ phase }),

  active: 0, // index of the screen in focus
  setActive: (active) => set({ active }),

  opened: null, // project id currently opened as a live site
  setOpened: (opened) => set({ opened }),

  viewerReady: false, // live iframe has finished loading
  setViewerReady: (viewerReady) => set({ viewerReady }),

  indexOpen: false,
  setIndexOpen: (indexOpen) => set({ indexOpen }),
}));

// Mutable, per-frame values the scene reads without triggering React renders.
export const motionState = {
  target: 0, // scroll-driven carousel position (0..n-1)
  progress: 0, // damped carousel position the scene actually renders
  calm: 1, // 1 = free camera drift, 0 = locked (a screen is open)
  pointer: { x: 0, y: 0 }, // normalised -1..1
  hovered: -1,
};
