"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PROJECTS } from "@/lib/projects";
import { useStore, motionState } from "@/lib/store";
import { getLenis, scrollToTarget } from "@/lib/lenis";
import { clamp } from "@/lib/motion";
import LiveViewer from "./LiveViewer";

gsap.registerPlugin(ScrollTrigger);

const Scene = dynamic(() => import("./Scene"), { ssr: false });
const N = PROJECTS.length;
const FX = { opacity: 0, filter: "blur(12px)", y: 10 };

function Info() {
  const active = useStore((s) => s.active);
  const [shown, setShown] = useState(0);
  const wrap = useRef(null);
  const first = useRef(true);
  const phase = useStore((s) => s.phase);

  useEffect(() => {
    if (phase !== "entering") return;
    gsap.fromTo(
      wrap.current.querySelectorAll("[data-fx]"),
      FX,
      { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.07, delay: 0.9, ease: "power3.out" }
    );
  }, [phase]);

  useEffect(() => {
    if (active === shown) return;
    const fx = wrap.current.querySelectorAll("[data-fx]");
    gsap.killTweensOf(fx);
    gsap.to(fx, {
      opacity: 0,
      filter: "blur(10px)",
      y: -8,
      duration: 0.28,
      stagger: 0.015,
      ease: "power2.in",
      onComplete: () => setShown(active),
    });
  }, [active, shown]);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      gsap.set(wrap.current.querySelectorAll("[data-fx]"), { opacity: 0 });
      return;
    }
    gsap.fromTo(
      wrap.current.querySelectorAll("[data-fx]"),
      FX,
      { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.8, stagger: 0.055, ease: "power3.out" }
    );
  }, [shown]);

  const p = PROJECTS[shown];
  // rows adapt to the project: apps have no year; a co-developer is credited with a link
  const rows = [["Type", p.kind]];
  if (p.year) rows.push(["Year", p.year]);
  rows.push(["Role", p.role], ["Stack", p.stack]);
  if (p.collab) {
    rows.push([
      "With",
      <a
        key="collab"
        href={p.collab.url}
        target="_blank"
        rel="noopener noreferrer"
        data-cursor="hover"
        className="pointer-events-auto underline-offset-4 hover:underline"
      >
        {p.collab.name} &#8599;
      </a>,
    ]);
  }

  return (
    <div ref={wrap} data-info>
      <div className="pointer-events-none absolute left-6 top-[88px] w-[min(340px,calc(100vw-48px))] sm:left-10 md:top-[26px] md:w-[340px]">
        <h2
          data-fx
          className="serif text-[clamp(2.3rem,4.4vw,3.6rem)] uppercase leading-[0.9] tracking-[-0.01em]"
        >
          {p.title}
        </h2>
        <div className="mt-2.5">
          {rows.map(([k, v], i) => (
            <div
              data-fx
              key={k}
              className={`flex items-start justify-between gap-6 border-t border-ink/90 py-[7px] ${i > 1 ? "max-md:hidden" : ""}`}
            >
              <span className="eyebrow pt-[3px] text-[0.625rem]">{k}</span>
              <span className="text-right text-[0.9rem] leading-[1.25] tracking-[-0.01em]">
                {Array.isArray(v) ? v.map((x) => <span key={x} className="block">{x}</span>) : v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[84px] flex justify-center gap-10 px-6 text-center md:bottom-[34px] md:gap-16">
        <div data-fx className="max-w-[300px]">
          <p className="eyebrow mb-2 text-[0.625rem]">The brief</p>
          <p className="serif text-[1.05rem] leading-[1.15] tracking-[-0.005em] md:text-[1.35rem]">{p.brief}</p>
        </div>
        <div data-fx className="hidden max-w-[300px] md:block">
          <p className="eyebrow mb-2 text-[0.625rem]">The note</p>
          <p className="serif text-[1.25rem] italic leading-[1.15]">{p.note}</p>
        </div>
      </div>
    </div>
  );
}

function Counter() {
  const active = useStore((s) => s.active);
  const phase = useStore((s) => s.phase);
  const wrap = useRef(null);
  useEffect(() => {
    if (phase !== "entering") return;
    gsap.fromTo(
      wrap.current,
      { opacity: 0, y: 14, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, delay: 1.1, ease: "power3.out" }
    );
  }, [phase]);
  return (
    <div
      ref={wrap}
      className="pointer-events-none absolute bottom-6 left-6 flex items-end gap-5 opacity-0 sm:left-10 md:bottom-[34px]"
    >
      <p className="serif text-[2.6rem] leading-none tabular-nums tracking-[-0.02em]">
        {String(active + 1).padStart(2, "0")}
        <span className="eyebrow ml-2 align-middle text-ink-soft">/ {String(N).padStart(2, "0")}</span>
      </p>
    </div>
  );
}

export default function Work({ mountScene }) {
  const section = useRef(null);
  const [onScreen, setOnScreen] = useState(true);
  const hint = useRef(null);
  const opened = useStore((s) => s.opened);
  const phase = useStore((s) => s.phase);

  // the 3D scene only renders while the showcase is near the viewport
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(section.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = section.current;
    const steps = N - 1;
    let snapTimer;

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        motionState.target = self.progress * steps;
      },
    });

    const range = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      return { top, span: el.offsetHeight - window.innerHeight };
    };

    // Magnetic snap to the nearest screen once scrolling settles inside the section.
    const onScroll = () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const lenis = getLenis();
        if (!lenis || useStore.getState().opened) return;
        const { top, span } = range();
        const local = window.scrollY - top;
        if (local < -10 || local > span + 10) return;
        const idx = clamp(Math.round((local / span) * steps), 0, steps);
        const dest = top + (idx / steps) * span;
        if (Math.abs(dest - window.scrollY) > 4) lenis.scrollTo(dest, { duration: 0.8, easing: (t) => 1 - Math.pow(1 - t, 3) });
      }, 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Rapid presses accumulate: steps are taken relative to the screen we are already
    // travelling to, not the (lagging) one currently in focus.
    let goal = null;
    let goalAt = 0;
    motionState.goTo = (i) => {
      goal = i;
      goalAt = performance.now();
      const { top, span } = range();
      scrollToTarget(top + (i / steps) * span, { duration: 1.3 });
    };
    motionState.step = (dir) => {
      // keep stepping from the goal until the carousel actually arrives (4s safety cap)
      const travelling = goal != null && performance.now() - goalAt < 4000 && Math.round(motionState.progress) !== goal;
      const base = travelling ? goal : useStore.getState().active;
      motionState.goTo(clamp(base + dir, 0, steps));
    };

    // keyboard
    const key = (e) => {
      if (useStore.getState().opened || useStore.getState().phase !== "site") return;
      const a = useStore.getState().active;
      if (e.key === "ArrowRight") motionState.step(1);
      if (e.key === "ArrowLeft") motionState.step(-1);
      if (e.key === "Enter") {
        const { top, span } = range();
        const local = window.scrollY - top;
        if (local >= -10 && local <= span + 10) useStore.getState().setOpened(PROJECTS[a].id);
      }
    };
    window.addEventListener("keydown", key);

    return () => {
      st.kill();
      clearTimeout(snapTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", key);
      motionState.goTo = null;
      motionState.step = null;
    };
  }, []);

  // hint fades once the visitor moves
  useEffect(() => {
    if (phase !== "site") return;
    const el = hint.current;
    gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 1, delay: 2.2, ease: "power3.out" });
    const hide = () => gsap.to(el, { opacity: 0, duration: 0.5 });
    const t = setTimeout(hide, 9000);
    window.addEventListener("wheel", hide, { once: true, passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("wheel", hide);
    };
  }, [phase]);

  return (
    <section
      id="work"
      ref={section}
      className="relative"
      style={{ height: `${N * 100}vh` }}
      aria-label="Selected work"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {mountScene && <Scene active={onScreen} />}

        <div
          className="transition-opacity duration-500"
          style={{ opacity: opened ? 0 : 1, pointerEvents: opened ? "none" : undefined }}
        >
          <Info />
          <Counter />
        </div>

        <p
          ref={hint}
          className="eyebrow pointer-events-none absolute inset-x-0 top-[56px] text-center text-ink-soft opacity-0 md:top-[76px]"
        >
          Scroll to travel&nbsp;&nbsp;·&nbsp;&nbsp;Open a screen to go live
        </p>
      </div>

      {opened && <LiveViewer />}
    </section>
  );
}
