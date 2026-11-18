"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * A screen recording for a phone tile, kept out of the way until it is wanted:
 *  - nothing downloads until the tile is within about one tile of the centre — and never on narrow
 *    screens, with Data Saver on, or for visitors who prefer reduced motion;
 *  - it plays only while its tile is centred and pauses the moment it isn't (it also pauses when the 3D
 *    scene is paused or the tab is hidden), so at most one video ever decodes;
 *  - until the first frame arrives the caller keeps showing the poster image, and once it has played
 *    the paused video keeps its last frame on screen.
 *
 * Returns the THREE texture (null until ready) and a `tick(d, viewportWidth)` to call every frame,
 * where `d` is the tile's signed distance from the centre in tile units.
 */
export function useScreenVideo(src, dims) {
  const [texture, setTexture] = useState(null);
  const state = useRef({ el: null, started: false, ready: false });

  useEffect(() => {
    if (!src) return;
    const st = state.current;
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "none";
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    st.el = v;
    st.started = false;
    st.ready = false;

    let tex = null;
    const onData = () => {
      tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      // "cover" fit: the recording is a hair narrower than the phone screen, so trim the top/bottom evenly
      const va = v.videoWidth / v.videoHeight;
      const sa = dims.w / dims.h;
      if (va < sa) {
        tex.repeat.set(1, va / sa);
        tex.offset.set(0, (1 - va / sa) / 2);
      } else {
        tex.repeat.set(sa / va, 1);
        tex.offset.set((1 - sa / va) / 2, 0);
      }
      st.ready = true;
      setTexture(tex);
    };
    v.addEventListener("loadeddata", onData, { once: true });

    const pause = () => v.pause();
    const onVisibility = () => document.hidden && pause();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scene-paused", pause);

    return () => {
      v.removeEventListener("loadeddata", onData);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scene-paused", pause);
      v.pause();
      v.removeAttribute("src");
      v.load();
      tex?.dispose();
      st.el = null;
    };
  }, [src, dims]);

  const tick = (d, viewportWidth) => {
    const st = state.current;
    const v = st.el;
    if (!v) return;
    const allowed = viewportWidth >= 768 && !prefersReducedMotion() && !(navigator.connection && navigator.connection.saveData);
    if (!allowed) return;
    const ad = Math.abs(d);
    if (!st.started && ad < 1.1) {
      st.started = true;
      v.src = src;
      v.load(); // begin downloading now that the visitor is about to arrive
    }
    if (st.ready) {
      const centred = ad < 0.4;
      if (centred && v.paused) v.play().catch(() => {});
      else if (!centred && !v.paused) v.pause();
    }
  };

  return { texture, tick };
}
