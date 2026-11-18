"use client";

import { useCallback, useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStore } from "@/lib/store";
import { setLenis } from "@/lib/lenis";
import { loadSite } from "@/lib/loader";
import { prefersReducedMotion } from "@/lib/motion";
import Preloader from "./preloader/Preloader";
import Nav from "./Nav";
import Cursor from "./Cursor";
import Work from "./work/Work";
import About from "./About";
import Beyond from "./Beyond";
import Stack from "./Stack";
import Footer from "./Footer";
import ScreenNotice from "./ScreenNotice";

gsap.registerPlugin(ScrollTrigger);

export default function Experience() {
  const phase = useStore((s) => s.phase);
  const setPhase = useStore((s) => s.setPhase);
  const loadRef = useRef({ value: 0 });
  const lenisRef = useRef(null);
  const loadStarted = useRef(false);

  // Smooth scroll, wired into GSAP's ticker so ScrollTrigger reads true positions.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({ duration: 1.2, smoothWheel: true, touchMultiplier: 1.4 });
    lenisRef.current = lenis;
    setLenis(lenis);
    lenis.stop(); // frozen until the site opens
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (phase === "site") {
      lenis?.start();
      document.documentElement.style.overflow = "";
      ScrollTrigger.refresh();
    } else {
      lenis?.stop();
      if (!lenis) document.documentElement.style.overflow = "hidden";
    }
  }, [phase]);

  // Start loading right away: the intro dialogues take ~6s, so fonts, the 3D chunk and the images arrive
  // while you read them. The button then shows the real progress (it never completes before its
  // minimum fill time either, so it still reads as a loader).
  useEffect(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    loadSite((p) => {
      loadRef.current.value = Math.max(loadRef.current.value, p);
    }).then(() => {
      loadRef.current.value = 1;
    });
  }, []);

  const onLoaded = useCallback(() => setPhase("ready"), [setPhase]);
  const onRevealStart = useCallback(() => setPhase("entering"), [setPhase]);
  const onDone = useCallback(() => setPhase("site"), [setPhase]);

  const mountScene = phase !== "intro";

  return (
    <>
      <main className="relative bg-paper">
        <Work mountScene={mountScene} />
        <About />
        <Beyond />
        <Stack />
      </main>
      {/* in normal flow, so it scrolls natively with the page; also the #contact anchor */}
      <Footer />

      <Nav />
      <Cursor />
      <div className="grain" aria-hidden />

      <ScreenNotice />

      <PreloaderGate phase={phase}>
        <Preloader
          phase={phase}
          loadRef={loadRef}
          onLoaded={onLoaded}
          onRevealStart={onRevealStart}
          onDone={onDone}
        />
      </PreloaderGate>
    </>
  );
}

// Unmount the preloader once it has fully left so it can't intercept anything.
function PreloaderGate({ phase, children }) {
  return phase === "site" ? null : children;
}
