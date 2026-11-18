// Tiny module-level handle so any component can drive the smooth scroller.
let instance = null;

export const setLenis = (l) => {
  instance = l;
};
export const getLenis = () => instance;

export function scrollToTarget(target, opts = {}) {
  if (instance) instance.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts });
  else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
}
