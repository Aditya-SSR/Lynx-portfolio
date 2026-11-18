"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

// Character ramp (light → dense).
const RAMP = ".:+#%@0369";
// Resting characters only flicker through the dense end — sparse glyphs (. :) would turn
// thin line-art into dotted noise. The full ramp is used while characters are in flight.
const DENSE = "+#%@0369";
const CHAR = "#e8e8e8";
const LIT = 0.09; // darkness above which a cell belongs to the shape (dark art on white)
const SS = 4; // supersampling per cell, area-averaged so thin strokes survive downscaling

// hover physics (per 60 Hz step)
const PUSH_RADIUS = 5;
const PUSH_FORCE = 30;
const SPRING = 0.025;
const DAMPING = 0.5;
const STEP = 1 / 60;
const HOT_RADIUS = 6.5; // characters near the pointer scramble wildly

// the morph: the SAME characters fly from the lynx to the word, then back
const HOLD = 2.6; // seconds each form rests
const FLIGHT = 1.0; // seconds one character spends travelling
const SPREAD = 0.5; // left→right wave across the shape
const JITTER = 0.3;
const TRANS = SPREAD + JITTER + FLIGHT + 0.05;
const WORD = "LYNX";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * AsciiLogo — a shape drawn in monospace characters on a transparent canvas. Each character
 * is a particle with a home in the logo (`src`, dark line-art on white) and a home in the
 * word "LYNX". Every few seconds the particles scramble and fly along curved paths from one
 * form to the other. Moving the pointer through it shoves characters outward (spring-back
 * physics) and scrambles the ones it touches.
 */
export default function AsciiLogo({ src, active = true, label = "Logo" }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  });

  useEffect(() => {
    const box = wrap.current;
    const cv = canvas.current;
    const ctx = cv.getContext("2d");
    const reduced = prefersReducedMotion();

    let img = null;
    let bounds = null; // dark-pixel bounding box of the source image
    let cell = 6;
    let step = 7;
    let cols = 0;
    let rows = 0;

    // particles (flat arrays)
    let M = 0;
    let ax = new Float32Array(0); // logo cell
    let ay = new Float32Array(0);
    let bx = new Float32Array(0); // word cell
    let by = new Float32Array(0);
    let perpX = new Float32Array(0); // sideways bow of the flight path
    let perpY = new Float32Array(0);
    let delay = new Float32Array(0);
    let visA = new Uint8Array(0); // 0 when this particle just duplicates another at rest
    let visB = new Uint8Array(0);
    let px = new Float32Array(0); // current position (cells)
    let py = new Float32Array(0);
    let state = new Int8Array(0); // 0 not started · 1 flying · 2 arrived
    let ox = new Float32Array(0); // hover displacement + velocity
    let oy = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let chars = [];

    // morph state
    let showing = 0; // 0 = logo, 1 = word
    let trans = false;
    let tt = 0;
    let holdT = 0;

    const mouse = { x: -999, y: -999 };
    let moving = false;
    let lastMove = -1e9;
    let moveTimer;
    let raf;
    let last = 0;
    let clock = 0;
    let acc = 0;
    let scrambleAcc = 0;
    let dirty = true;

    const findBounds = () => {
      const s = 256;
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.fillStyle = "#fff";
      x.fillRect(0, 0, s, s);
      x.drawImage(img, 0, 0, s, s);
      const d = x.getImageData(0, 0, s, s).data;
      let x0 = s, y0 = s, x1 = 0, y1 = 0;
      for (let y = 0; y < s; y++) {
        for (let xx = 0; xx < s; xx++) {
          if (d[(y * s + xx) * 4] < 140) {
            if (xx < x0) x0 = xx;
            if (xx > x1) x1 = xx;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      const k = img.naturalWidth / s;
      const pad = 6;
      bounds = {
        sx: Math.max(0, (x0 - pad) * k),
        sy: Math.max(0, (y0 - pad) * k),
        sw: Math.min(img.naturalWidth, (x1 - x0 + pad * 2) * k),
        sh: Math.min(img.naturalHeight, (y1 - y0 + pad * 2) * k),
      };
    };

    /** Area-average a painted offscreen canvas (dark on white) into mask at (ox0, oy0). */
    const sampleInto = (mask, off, fw, fh, ox0, oy0) => {
      const o = off.getContext("2d", { willReadFrequently: true });
      const data = o.getImageData(0, 0, off.width, off.height).data;
      for (let cy = 0; cy < fh; cy++) {
        for (let cx = 0; cx < fw; cx++) {
          let sum = 0;
          for (let yy = 0; yy < SS; yy++) {
            for (let xx = 0; xx < SS; xx++) {
              const i = ((cy * SS + yy) * off.width + (cx * SS + xx)) * 4;
              sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            }
          }
          const dark = 1 - sum / (SS * SS * 255);
          const c = cx + ox0;
          const r = cy + oy0;
          if (dark > LIT && c >= 0 && r >= 0 && c < cols && r < rows) {
            mask[r * cols + c] = Math.min(1, dark * 2.2);
          }
        }
      }
    };

    const cellsOf = (mask) => {
      const out = [];
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (mask[r * cols + c] > 0) out.push(r * cols + c);
      return out; // ordered by column, then row — keeps the flight coherent (left stays left)
    };

    const build = () => {
      if (!img || !bounds) return;
      const r = box.getBoundingClientRect();
      const mobile = window.innerWidth < 768;
      cell = mobile ? 3 : 6;
      step = cell + 1;
      cols = Math.max(1, Math.floor(r.width / step));
      rows = Math.max(1, Math.floor(r.height / step));
      const N = cols * rows;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = cols * step * dpr;
      cv.height = rows * step * dpr;
      cv.style.width = `${cols * step}px`;
      cv.style.height = `${rows * step}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const maskLogo = new Float32Array(N);
      const maskWord = new Float32Array(N);

      // — the logo: fit (contain) the cropped image into the grid
      {
        const { sx, sy, sw, sh } = bounds;
        const scale = Math.min((cols * 0.94) / sw, (rows * 0.94) / sh);
        const fw = Math.max(1, Math.round(sw * scale));
        const fh = Math.max(1, Math.round(sh * scale));
        const off = document.createElement("canvas");
        off.width = fw * SS;
        off.height = fh * SS;
        const o = off.getContext("2d", { willReadFrequently: true });
        o.fillStyle = "#fff";
        o.fillRect(0, 0, off.width, off.height);
        o.imageSmoothingQuality = "high";
        o.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
        sampleInto(maskLogo, off, fw, fh, Math.floor((cols - fw) / 2), Math.floor((rows - fh) / 2));
      }

      // — the word: heavy sans, as wide as the grid allows
      {
        const off = document.createElement("canvas");
        off.width = cols * SS;
        off.height = rows * SS;
        const o = off.getContext("2d", { willReadFrequently: true });
        o.fillStyle = "#fff";
        o.fillRect(0, 0, off.width, off.height);
        o.fillStyle = "#000";
        const family = getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
        o.font = `800 100px ${family}`;
        const m = o.measureText(WORD);
        let size = (100 * off.width * 0.94) / m.width;
        size = Math.min(size, (off.height * 0.5) / 0.72);
        o.font = `800 ${size}px ${family}`;
        o.textAlign = "center";
        o.textBaseline = "alphabetic";
        const asc = o.measureText(WORD).actualBoundingBoxAscent || size * 0.72;
        o.fillText(WORD, off.width / 2, off.height / 2 + asc / 2);
        sampleInto(maskWord, off, cols, rows, 0, 0);
      }

      // — pair each particle's logo cell with a word cell (left-to-right order on both)
      const L = cellsOf(maskLogo);
      const W = cellsOf(maskWord);
      M = Math.max(L.length, W.length);
      ax = new Float32Array(M); ay = new Float32Array(M);
      bx = new Float32Array(M); by = new Float32Array(M);
      perpX = new Float32Array(M); perpY = new Float32Array(M);
      delay = new Float32Array(M);
      visA = new Uint8Array(M); visB = new Uint8Array(M);
      px = new Float32Array(M); py = new Float32Array(M);
      state = new Int8Array(M);
      ox = new Float32Array(M); oy = new Float32Array(M);
      vx = new Float32Array(M); vy = new Float32Array(M);
      chars = new Array(M);

      let prevA = -1;
      let prevB = -1;
      for (let k = 0; k < M; k++) {
        const ia = L[Math.floor((k * L.length) / M)];
        const ib = W[Math.floor((k * W.length) / M)];
        ax[k] = ia % cols; ay[k] = (ia / cols) | 0;
        bx[k] = ib % cols; by[k] = (ib / cols) | 0;
        visA[k] = ia === prevA ? 0 : 1;
        visB[k] = ib === prevB ? 0 : 1;
        prevA = ia;
        prevB = ib;
        const dx = bx[k] - ax[k];
        const dy = by[k] - ay[k];
        const len = Math.hypot(dx, dy) || 1;
        const bow = (2 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1);
        perpX[k] = (-dy / len) * bow;
        perpY[k] = (dx / len) * bow;
        chars[k] = DENSE[(Math.random() * DENSE.length) | 0];
      }
      trans = false;
      holdT = 0;
      place();
      dirty = true;
    };

    /** where every particle is right now (home cell, or somewhere along its flight) */
    function place() {
      for (let k = 0; k < M; k++) {
        const fx = showing === 0 ? ax[k] : bx[k];
        const fy = showing === 0 ? ay[k] : by[k];
        const tx = showing === 0 ? bx[k] : ax[k];
        const ty = showing === 0 ? by[k] : ay[k];
        if (!trans) {
          px[k] = fx;
          py[k] = fy;
          state[k] = 2;
          continue;
        }
        const t = clamp01((tt - delay[k]) / FLIGHT);
        const e = ease(t);
        const bow = Math.sin(Math.PI * e);
        px[k] = fx + (tx - fx) * e + perpX[k] * bow;
        py[k] = fy + (ty - fy) * e + perpY[k] * bow;
        state[k] = t <= 0 ? 0 : t >= 1 ? 2 : 1;
      }
    }

    const startTransition = () => {
      trans = true;
      tt = 0;
      for (let k = 0; k < M; k++) {
        const srcCol = showing === 0 ? ax[k] : bx[k];
        delay[k] = (srcCol / cols) * SPREAD + Math.random() * JITTER;
      }
    };

    const render = (now) => {
      ctx.clearRect(0, 0, cols * step, rows * step);
      ctx.fillStyle = CHAR;
      ctx.font = `600 ${cell + 2}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const hot = now - lastMove < 450;
      for (let k = 0; k < M; k++) {
        // duplicates (extra particles sharing a cell) only show while they are travelling
        let show;
        if (!trans) show = (showing === 0 ? visA[k] : visB[k]) === 1;
        else if (state[k] === 1) show = true;
        else if (state[k] === 0) show = (showing === 0 ? visA[k] : visB[k]) === 1;
        else show = (showing === 0 ? visB[k] : visA[k]) === 1;
        if (!show) continue;

        const c = Math.round(px[k] + ox[k]);
        const r = Math.round(py[k] + oy[k]);
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        let ch = chars[k];
        if (state[k] === 1 && trans) ch = RAMP[(Math.random() * RAMP.length) | 0];
        else if (hot && Math.hypot(px[k] + ox[k] - mouse.x, py[k] + oy[k] - mouse.y) < HOT_RADIUS) {
          ch = RAMP[(Math.random() * RAMP.length) | 0];
        }
        ctx.fillText(ch, c * step + cell / 2, r * step);
      }
      dirty = false;
    };

    const physics = () => {
      let moved = false;
      for (let k = 0; k < M; k++) {
        if (moving) {
          const dx = px[k] + ox[k] - mouse.x;
          const dy = py[k] + oy[k] - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < PUSH_RADIUS && d > 0.0001) {
            const f = Math.pow(1 - d / PUSH_RADIUS, 2) * PUSH_FORCE;
            vx[k] += (dx / d) * f;
            vy[k] += (dy / d) * f;
          }
        }
        vx[k] += -ox[k] * SPRING;
        vy[k] += -oy[k] * SPRING;
        vx[k] *= DAMPING;
        vy[k] *= DAMPING;
        ox[k] += vx[k];
        oy[k] += vy[k];
        if (Math.abs(ox[k]) < 0.01 && Math.abs(vx[k]) < 0.01) { ox[k] = 0; vx[k] = 0; }
        if (Math.abs(oy[k]) < 0.01 && Math.abs(vy[k]) < 0.01) { oy[k] = 0; vy[k] = 0; }
        if (ox[k] !== 0 || oy[k] !== 0) moved = true;
      }
      if (moved) dirty = true;
    };

    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      if (!activeRef.current || !M) return;
      clock += dt;

      // schedule: rest → particles fly → rest …
      if (!trans) {
        holdT += dt;
        if (holdT >= HOLD) startTransition();
      } else {
        tt += dt;
        dirty = true;
        if (tt >= TRANS) {
          trans = false;
          showing = showing === 0 ? 1 : 0;
          holdT = 0;
        }
      }
      place();

      acc += dt;
      while (acc >= STEP) {
        physics();
        acc -= STEP;
      }
      scrambleAcc += dt;
      if (scrambleAcc >= 0.05) {
        scrambleAcc = 0;
        for (let k = 0; k < M; k++) chars[k] = DENSE[(Math.random() * DENSE.length) | 0];
        dirty = true;
      }
      if (moving || clock * 1000 - lastMove < 450) dirty = true;
      if (dirty) render(clock * 1000);
    };

    const onMove = (e) => {
      const r = cv.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / step;
      mouse.y = (e.clientY - r.top) / step;
      moving = true;
      lastMove = clock * 1000;
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => (moving = false), 50);
    };
    const onLeave = () => {
      mouse.x = mouse.y = -999;
    };

    const image = new Image();
    image.onload = () => {
      img = image;
      findBounds();
      build();
      render(0);
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    image.src = src;

    let rt;
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        build();
        render(0);
      }, 120);
    });
    ro.observe(box);

    if (!reduced) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(moveTimer);
      clearTimeout(rt);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [src]);

  return (
    <div ref={wrap} className="absolute inset-0 flex items-center justify-center">
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}
