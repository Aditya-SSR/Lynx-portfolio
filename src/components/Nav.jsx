"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { PROJECTS } from "@/lib/projects";
import { useStore, motionState } from "@/lib/store";
import { scrollToTarget } from "@/lib/lenis";

const LINKS = [
  { id: "work", label: "Showcase" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

/**
 * Nav — inside the showcase it shows only the section name; once you scroll past the
 * showcase the full bar (Lynx®, Showcase, About, Contact, Index) takes over. The two
 * states are one CSS switch (`data-mode`), so they can never stack or half-reveal.
 * Hovering Index opens a white card listing the projects.
 */
export default function Nav() {
  const phase = useStore((s) => s.phase);
  const opened = useStore((s) => s.opened);
  const [mode, setMode] = useState("solo"); // solo | full
  const [current, setCurrent] = useState("work");
  const [indexOpen, setIndexOpen] = useState(false);
  const root = useRef(null);
  const closeTimer = useRef(null);

  // entrance
  useEffect(() => {
    if (phase !== "entering" && phase !== "site") return;
    gsap.fromTo(
      root.current,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 1.1, delay: 0.5, ease: "power3.out", clearProps: "transform" }
    );
  }, [phase]);

  // solo ⇄ full, with hysteresis so it can't flicker around the threshold
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const work = document.getElementById("work");
      if (!work) return;
      const bottom = work.getBoundingClientRect().bottom;
      // current section = the last one whose top has passed the middle of the screen
      const mid = window.innerHeight * 0.5;
      let now = "work";
      for (const id of ["about", "contact"]) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= mid) now = id;
      }
      setCurrent(now);
      setMode((m) => {
        if (m === "solo" && bottom < window.innerHeight * 0.5) return "full";
        if (m === "full" && bottom > window.innerHeight * 0.66) return "solo";
        return m;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const openIndex = useCallback(() => {
    clearTimeout(closeTimer.current);
    setIndexOpen(true);
  }, []);
  const closeIndex = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIndexOpen(false), 160);
  }, []);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setIndexOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const go = (id) => {
    setIndexOpen(false);
    scrollToTarget(`#${id}`, { offset: 0 });
  };

  const full = mode === "full";
  const open = indexOpen && full; // the card only exists in the full bar
  const hidden = "pointer-events-none invisible -translate-y-2 opacity-0";
  const shown = "visible translate-y-0 opacity-100";

  return (
    <>
      {/* Index card — white, solid, sits *under* the (blended) nav row so the row reads black on it */}
      <div
        onMouseEnter={openIndex}
        onMouseLeave={closeIndex}
        aria-hidden={!open}
        className="fixed left-1/2 top-3 z-[69] hidden w-[min(470px,calc(100vw-24px))] -translate-x-1/2 bg-white text-ink md:block"
        style={{
          clipPath: open ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "clip-path .55s cubic-bezier(.16,1,.3,1), opacity .25s ease, visibility 0s linear " + (open ? "0s" : ".55s"),
          boxShadow: "0 30px 60px -24px rgba(0,0,0,.35)",
        }}
      >
        <ul className="px-5 pb-5 pt-[58px]">
          {PROJECTS.map((p, i) => (
            <li
              key={p.id}
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(8px)",
                transition: `opacity .5s ease ${open ? 0.12 + i * 0.045 : 0}s, transform .6s cubic-bezier(.16,1,.3,1) ${open ? 0.12 + i * 0.045 : 0}s`,
              }}
            >
              <button
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  go("work");
                  setTimeout(() => motionState.goTo?.(i), 450);
                }}
                data-cursor="hover"
                className="group flex w-full items-baseline gap-4 px-3 py-[7px] text-left transition-colors duration-150 hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white"
              >
                <span className="eyebrow w-5 opacity-50">{p.index}</span>
                <span className="serif flex-1 text-[1.5rem] uppercase leading-none">{p.title}</span>
                <span className="eyebrow opacity-50">{p.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <header
        ref={root}
        data-mode={mode}
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] opacity-0 mix-blend-difference [&_button]:pointer-events-auto"
        style={{ color: "#fff", pointerEvents: opened ? "none" : undefined, visibility: opened ? "hidden" : undefined }}
      >
        <div className="relative mx-auto max-w-[1800px] px-6 pt-[22px] sm:px-10">
          {/* inside the showcase: just the section name */}
          <div
            className={`pointer-events-none absolute inset-x-0 top-[22px] flex justify-center transition-[opacity,transform,visibility] duration-500 ease-out ${full ? hidden : shown}`}
          >
            <span className="relative flex flex-col items-center text-[0.95rem] tracking-[-0.01em]">
              Showcase
              <span className="absolute -bottom-[9px] h-[4px] w-[4px] rounded-full bg-current" />
            </span>
          </div>

          {/* past the showcase: the full bar */}
          <nav
            className={`relative flex items-start justify-between transition-[opacity,transform,visibility] duration-500 ease-out md:justify-center md:gap-9 ${full ? `${shown} delay-150` : hidden}`}
          >
            <button
              onClick={() => scrollToTarget(0, { duration: 2 })}
              data-cursor="hover"
              className="serif text-[1.5rem] leading-none tracking-[-0.01em]"
              aria-label="Lynx — back to top"
            >
              Lynx<span className="align-super text-[0.55em]">®</span>
            </button>

            <ul className="flex items-start gap-5 md:gap-9">
              {LINKS.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => go(l.id)}
                    data-cursor="hover"
                    className={`relative flex flex-col items-center text-[0.95rem] tracking-[-0.01em] transition-opacity duration-300 ${current === l.id ? "opacity-100" : "opacity-55 hover:opacity-100"}`}
                  >
                    {l.label}
                    <span
                      className="absolute -bottom-[9px] h-[4px] w-[4px] rounded-full bg-current transition-transform duration-500"
                      style={{ transform: current === l.id ? "scale(1)" : "scale(0)" }}
                    />
                  </button>
                </li>
              ))}
              <li className="hidden md:block">
                <button
                  onMouseEnter={openIndex}
                  onMouseLeave={closeIndex}
                  onFocus={openIndex}
                  onClick={() => setIndexOpen((v) => !v)}
                  data-cursor="hover"
                  className="flex items-center gap-1 text-[0.95rem] tracking-[-0.01em]"
                  aria-expanded={open}
                >
                  Index
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    className="transition-transform duration-300"
                    style={{ transform: open ? "rotate(180deg)" : "none" }}
                  >
                    <path d="m1.5 3.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}
