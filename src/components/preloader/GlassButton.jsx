"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { clamp } from "@/lib/motion";

const W = 320;
const H = 84;
const MIN_MS = 2800; // never "completes" faster than this, even on a warm cache
const LABEL = "Enter Portfolio";
const GLYPHS = "+#%@0369";

/**
 * The CTA *is* the loader.
 *  - An empty outline: a thin line traces around the pill with the real load progress.
 *  - The label writes itself: each letter resolves out of scrambled characters, left to right,
 *    as loading advances (the same scramble language as the footer's ASCII logo).
 *  - At 100% black floods the button from the left, the label inverts, the arrow pops in,
 *    and the button becomes clickable.
 */
export default function GlassButton({ phase, loadRef, onLoaded, onClick }) {
  const btn = useRef(null);
  const ring = useRef(null);
  const fill = useRef(null);
  const arrow = useRef(null);
  const started = useRef(false);
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  });

  useEffect(() => {
    const cells = btn.current.querySelectorAll("[data-g]");
    const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
    cells.forEach((c) => (c.textContent = rand())); // start fully scrambled
  }, []);

  useEffect(() => {
    if (phase !== "loading" || started.current) return;
    started.current = true;
    const root = btn.current;
    const cells = [...root.querySelectorAll("[data-g]")];
    const total = cells.length;
    const t0 = performance.now();
    let shown = 0;
    let lastScramble = 0;
    let raf;

    const paint = (p, now) => {
      ring.current.style.strokeDashoffset = String(1 - p);
      const scramble = now - lastScramble > 55;
      if (scramble) lastScramble = now;
      cells.forEach((c, i) => {
        const resolved = p >= ((i + 1) / total) * 0.97;
        if (resolved) {
          if (c.dataset.done !== "1") {
            c.textContent = c.dataset.g;
            c.dataset.done = "1";
            c.style.color = "var(--ink)";
          }
        } else if (scramble) {
          c.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      });
    };

    const tick = (now) => {
      const time = clamp((now - t0) / MIN_MS, 0, 1);
      const floor = 1 - Math.pow(1 - time, 2.2);
      const cap = Math.min(loadRef.current.value, floor);
      shown += (cap - shown) * 0.08;
      if (cap - shown < 0.0008) shown = cap;
      paint(shown, now);

      if (shown >= 0.999 && time >= 1 && loadRef.current.value >= 1) {
        paint(1, now);
        // loaded: black floods in from the left, then the arrow pops
        const f = { v: 0 };
        gsap.to(f, {
          v: 1,
          duration: 0.75,
          ease: "power3.inOut",
          onUpdate: () => (fill.current.style.clipPath = `inset(0 ${((1 - f.v) * 100).toFixed(2)}% 0 0 round 9999px)`),
        });
        gsap.fromTo(
          arrow.current,
          { scale: 0, rotate: -90, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.8, delay: 0.6, ease: "back.out(1.7)" }
        );
        gsap.delayedCall(1.2, () => onLoadedRef.current?.());
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, loadRef]);

  const ready = phase === "ready";

  return (
    <button
      ref={btn}
      type="button"
      onClick={ready ? onClick : undefined}
      aria-disabled={!ready}
      aria-label={ready ? "Enter portfolio" : "Loading portfolio"}
      data-cursor={ready ? "enter" : undefined}
      className={`group relative block rounded-full outline-none transition-transform duration-500 ease-out ${ready ? "hover:-translate-y-0.5 active:translate-y-0" : "cursor-default"}`}
      style={{ width: W, height: H }}
    >
      {/* the outline: a faint track, and the line that traces it with load progress */}
      <svg className="pointer-events-none absolute inset-0 overflow-visible" width={W} height={H} aria-hidden>
        <rect x="0.75" y="0.75" width={W - 1.5} height={H - 1.5} rx={(H - 1.5) / 2} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" />
        <rect
          ref={ring}
          x="0.75"
          y="0.75"
          width={W - 1.5}
          height={H - 1.5}
          rx={(H - 1.5) / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="1"
        />
      </svg>

      {/* the label that writes itself (ink) */}
      <span className="absolute inset-0 flex items-center pl-9 text-[1.05rem] font-semibold tracking-[-0.01em]">
        {LABEL.split("").map((c, i) =>
          c === " " ? (
            <span key={i} className="inline-block w-[0.32em]" />
          ) : (
            <span key={i} className="relative inline-block overflow-hidden">
              <span className="invisible">{c}</span>
              <span data-g={c} className="absolute inset-0 text-center" style={{ color: "rgba(11,11,11,0.38)" }}>
                +
              </span>
            </span>
          )
        )}
      </span>

      {/* the flood: black fill with the label inverted, and the arrow */}
      <span
        ref={fill}
        aria-hidden
        className="absolute inset-0 rounded-full bg-ink text-white"
        style={{ clipPath: "inset(0 100% 0 0 round 9999px)" }}
      >
        <span className="absolute inset-0 flex items-center justify-between pl-9 pr-[14px]">
          <span className="text-[1.05rem] font-semibold tracking-[-0.01em]">{LABEL}</span>
          <span ref={arrow} className="grid h-[56px] w-[56px] place-items-center rounded-full bg-white text-ink opacity-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="transition-transform duration-500 ease-out group-hover:translate-x-0.5">
              <path d="M3 9h12M10 4l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </span>
    </button>
  );
}
