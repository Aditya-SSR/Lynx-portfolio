"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

const STACK = ["Next.js", "R3F", "React Three Drei", "GSAP", "Express", "Node.js", "MongoDB", "PostgreSQL"];

const BASE = 120; // resting speed, px per second
const BOOST_MAX = 2.2; // extra speed multiplier at the fastest scrolling
const BOOST_REF = 900; // scroll speed (px/s) that maps to full boost

/**
 * A big scrolling line of the tools I work with. It runs on GSAP's ticker — the same one that
 * drives Lenis — so it updates in the very same frame as the scroll. Scroll speed adds a
 * smoothed, capped boost (no per-event tweens), and it only runs while it's on screen.
 */
export default function Stack() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const track = root.current.querySelector("[data-marquee]");

      let half = track.scrollWidth / 2;
      const ro = new ResizeObserver(() => {
        half = track.scrollWidth / 2;
      });
      ro.observe(track);

      let visible = false;
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "200px 0px" });
      io.observe(root.current);

      let x = 0;
      let boost = 0;
      let lastY = window.scrollY;
      const tick = (_time, deltaMs) => {
        const y = window.scrollY;
        if (!visible) {
          lastY = y;
          return;
        }
        const dt = Math.min(deltaMs, 50) / 1000;
        const v = Math.abs(y - lastY) / Math.max(dt, 0.001);
        lastY = y;
        const target = Math.min(v / BOOST_REF, 1) * BOOST_MAX;
        boost += (target - boost) * (1 - Math.exp(-dt * 4)); // time-based easing, never snaps
        x -= BASE * (1 + boost) * dt;
        if (x <= -half) x += half;
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      };
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        ro.disconnect();
        io.disconnect();
      };
    },
    { scope: root }
  );

  return (
    <section ref={root} className="relative overflow-hidden pb-[16vh] pt-[6vh]" aria-label="Tools I work with">
      <div data-marquee className="flex w-max items-center whitespace-nowrap will-change-transform">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center" aria-hidden={k === 1}>
            {STACK.map((s, i) => (
              <span key={s + k} className="flex items-center">
                <span
                  className={`px-7 text-[clamp(3.5rem,10vw,9rem)] leading-none tracking-[-0.05em] ${i % 3 === 1 ? "serif italic" : "font-medium"}`}
                >
                  {s}
                </span>
                <span className="text-[clamp(1.2rem,2.6vw,2.4rem)]">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
