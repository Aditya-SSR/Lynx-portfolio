"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { PROJECTS } from "@/lib/projects";
import { useStore } from "@/lib/store";
import { getLenis } from "@/lib/lenis";
import { SCREEN, openRect } from "@/lib/layout";

/**
 * LiveViewer — when a 3D screen opens, the real site takes its place in an iframe.
 * The WebGL screen has already flown to the exact same rect, so the swap is seamless.
 * (The canvas stops rendering while this is open so two WebGL sites never fight the GPU.)
 */
export default function LiveViewer() {
  const id = useStore((s) => s.opened);
  const setOpened = useStore((s) => s.setOpened);
  const setViewerReady = useStore((s) => s.setViewerReady);
  const project = PROJECTS.find((p) => p.id === id);

  const root = useRef(null);
  const frame = useRef(null);
  const [rect, setRect] = useState(() => openRect(innerWidth, innerHeight));
  const [loaded, setLoaded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [show, setShow] = useState(false);
  const [slow, setSlow] = useState(false);

  // keep rect in sync with the viewport
  useEffect(() => {
    const on = () => setRect(openRect(innerWidth, innerHeight));
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // freeze page scroll while open; the iframe scrolls on its own
  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      setViewerReady(false);
    };
  }, [setViewerReady]);

  // Wait for the 3D screen to land before mounting the iframe.
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 950);
    const s = setTimeout(() => setSlow(true), 6000);
    return () => {
      clearTimeout(t);
      clearTimeout(s);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // let the iframe paint a frame, then fade it over the WebGL screen and pause the canvas
    const t = setTimeout(() => setViewerReady(true), 500);
    return () => clearTimeout(t);
  }, [loaded, setViewerReady]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setViewerReady(false); // resume the canvas
    gsap.to(root.current, {
      opacity: 0,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => setOpened(null),
    });
  };

  useEffect(() => {
    const key = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  if (!project) return null;

  const m = rect.mobile;
  const radius = m ? 0 : (SCREEN.r / SCREEN.w) * rect.w;
  const box = m
    ? { inset: 0 }
    : {
        width: rect.w,
        height: rect.h,
        left: "50%",
        top: "50%",
        transform: `translate(-50%, calc(-50% + ${rect.dy}px))`,
      };

  return (
    <div ref={root} className="fixed inset-0 z-[60]" data-viewer>
      {/* controls bar */}
      <div
        className={`pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-4 sm:px-10 ${m ? "z-10 bg-white/80 pb-3 backdrop-blur-md" : "pt-[22px]"}`}
        style={m ? undefined : { color: "var(--ink)" }}
      >
        <div className="flex items-baseline gap-3">
          <span className="serif text-[1.6rem] uppercase leading-none">{project.title}</span>
          <span className="eyebrow hidden text-ink-soft sm:inline">{project.kind}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="hover"
            className="glass flex h-10 items-center gap-2 rounded-full px-4 text-[0.8125rem] font-medium"
          >
            Open in new tab
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 11 11 3M5 3h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <button
            onClick={close}
            aria-label="Close live preview"
            data-cursor="hover"
            className="glass grid h-10 w-10 place-items-center rounded-full"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="m2 2 10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      {/* the live site, exactly over the 3D screen's face */}
      <div
        className="absolute overflow-hidden bg-white"
        style={{
          ...box,
          borderRadius: radius,
          opacity: loaded ? 1 : 0,
          transition: "opacity .5s ease",
          marginTop: m ? 64 : 0,
          ...(m ? { height: "calc(100% - 64px)" } : null),
        }}
      >
        {show && (
          <iframe
            ref={frame}
            src={project.url}
            title={`${project.title} — live preview`}
            onLoad={() => setLoaded(true)}
            allow="fullscreen; autoplay; clipboard-write"
            referrerPolicy="no-referrer"
            className="h-full w-full border-0"
          />
        )}
      </div>

      {/* loading cue while the live site arrives */}
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="eyebrow rounded-full bg-black/55 px-4 py-2 text-white backdrop-blur-md">
            {slow ? "Still loading the live site…" : "Loading live site"}
          </p>
        </div>
      )}

      {!m && (
        <p className="eyebrow pointer-events-none absolute inset-x-0 bottom-5 text-center text-ink-soft">
          Interact freely · press Esc to return
        </p>
      )}
    </div>
  );
}
