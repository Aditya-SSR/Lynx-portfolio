export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const isTouch = () =>
  typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
