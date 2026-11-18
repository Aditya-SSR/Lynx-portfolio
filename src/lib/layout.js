// Geometry shared by the WebGL scene and the DOM live-viewer so a screen that
// "opens" lines up pixel-for-pixel with the iframe that takes its place.

export const CAM = { fov: 35, z: 9 };
export const SCREEN = { w: 3.6, h: 2.25, r: 0.1, bezel: 0.07 }; // 16:10 face, world units
export const PHONE = { w: 1.5, h: 3.15, r: 0.2, bezel: 0.05, frame: 0.04, depth: 0.09 }; // iPhone-style: black glass bezel inside a titanium frame
export const ASPECT = SCREEN.w / SCREEN.h;
export const MOBILE_BP = 768;

/** pixels per world unit at z = 0 for a given viewport height */
export function pxPerUnit(viewH) {
  const visibleH = 2 * CAM.z * Math.tan((CAM.fov * Math.PI) / 360);
  return viewH / visibleH;
}

/** Where the live site sits when a screen is opened (desktop). Centre-relative px. */
export function openRect(viewW, viewH) {
  const mobile = viewW < MOBILE_BP;
  if (mobile) {
    return { mobile, w: viewW, h: viewH, dy: 0 };
  }
  const w = Math.min(1360, viewW * 0.84, (viewH - 190) * ASPECT);
  return { mobile, w, h: w / ASPECT, dy: 26 };
}

/** The sticky footer is 85% of the viewport; the spacer in Experience matches it. */
export const FOOTER_H = "max(85vh, 560px)";
