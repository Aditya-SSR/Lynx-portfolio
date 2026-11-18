"use client";

import { useEffect, useRef, useState } from "react";

const BREAKPOINT = 900; // below this the 3D showcase is a compromise, so say so up front
const KEY = "lynx-screen-notice";

/**
 * One-time heads-up for small screens: the showcase, the live site previews and the 3D phones are made for
 * a larger display. It sits above the preloader (which keeps loading underneath) and remembers the choice
 * for the rest of the session, so a reload doesn't nag.
 */
export default function ScreenNotice() {
  const [state, setState] = useState("closed"); // closed | open | leaving
  const button = useRef(null);

  useEffect(() => {
    // decided after hydration, in a frame callback, so server and client markup always match
    const id = requestAnimationFrame(() => {
      let seen = false;
      try {
        seen = sessionStorage.getItem(KEY) === "1";
      } catch {}
      if (!seen && window.innerWidth < BREAKPOINT) setState("open");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (state === "open") button.current?.focus({ preventScroll: true });
  }, [state]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setState("leaving");
    setTimeout(() => setState("closed"), 450);
  };

  if (state === "closed") return null;
  const leaving = state === "leaving";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="screen-notice-title"
      aria-describedby="screen-notice-body"
      onKeyDown={(e) => e.key === "Escape" && dismiss()}
      className="fixed inset-0 z-[200] grid place-items-center bg-paper/70 px-4 backdrop-blur-md transition-opacity duration-[450ms]"
      style={{ opacity: leaving ? 0 : 1, animation: "notice-fade 0.5s var(--ease-out) both" }}
    >
      <div
        className="w-full max-w-[380px] rounded-[28px] bg-white p-7 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] transition-transform duration-[450ms]"
        style={{
          transform: leaving ? "translateY(14px) scale(0.98)" : "none",
          animation: "notice-rise 0.7s var(--ease-out) 0.05s both",
        }}
      >
        {/* a monitor, drawn in the same hairline style as the rest of the site */}
        <svg viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mb-6 h-10 w-auto" aria-hidden>
          <rect x="4" y="4" width="56" height="34" rx="3.5" />
          <path d="M22 44h20M32 38v6" />
          <path d="M14 30l8-9 7 6 9-12 12 15" opacity="0.45" />
        </svg>

        <p className="eyebrow text-ink-soft">A small heads-up</p>
        <h2 id="screen-notice-title" className="serif mt-2 text-[2.1rem] leading-[1.02] tracking-tight">
          Best on a larger screen.
        </h2>
        <p id="screen-notice-body" className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
          This portfolio is built around a 3D showcase and live site previews. The experience and performance are at their best on a
          laptop or desktop.
        </p>

        <button
          ref={button}
          type="button"
          onClick={dismiss}
          className="mt-7 flex h-12 w-full items-center justify-center rounded-full bg-ink text-[0.95rem] font-medium text-white transition-transform duration-300 active:scale-[0.98]"
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
}
