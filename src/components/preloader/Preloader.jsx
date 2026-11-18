"use client";

import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useStore } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";
import GlassButton from "./GlassButton";

gsap.registerPlugin(useGSAP, SplitText);

const BLUR_IN = { opacity: 0, filter: "blur(18px)" };
const BLUR_OUT = { opacity: 0, filter: "blur(16px)" };

/**
 * Preloader — two dialogues on white, nothing else.
 *   01  "Hi! I am Lynx"           focus-pull: letters sharpen as tracking collapses
 *   02  "Welcome to my portfolio" words rise out of blur; the button appears below
 *       and *is* the loader — when it hits 100% the arrow reveals and you can enter.
 */
export default function Preloader({ phase, loadRef, onLoaded, onRevealStart, onDone }) {
  const root = useRef(null);
  const btnWrap = useRef(null);
  const revealRef = useRef(null);
  const setPhase = useStore((s) => s.setPhase);

  useGSAP(
    (_ctx, safe) => {
      const q = (s) => root.current.querySelector(s);
      const reduced = prefersReducedMotion();

      const build = () => {
        const d2 = q("[data-d='2']");
        const line = d2.querySelector("[data-line]");
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        const showButton = (at) => {
          tl.fromTo(
            btnWrap.current,
            { opacity: 0, filter: "blur(14px)", y: 26, scale: 0.92 },
            // clearProps matters: a leftover `filter` on an ancestor makes a "backdrop root"
            // and flattens the glass.
            { opacity: 1, filter: "blur(0px)", y: 0, scale: 1, duration: 1.1, clearProps: "filter", ease: "power3.out" },
            at
          ).call(() => setPhase("loading"), null, at + 0.5);
        };

        if (reduced) {
          gsap.set(d2, { visibility: "visible" });
          showButton(0.1);
          return;
        }

        /* ---------- 01 · Hi! I am Lynx ---------- */
        const d1 = q("[data-d='1']");
        const s1 = new SplitText(d1, { type: "chars", charsClass: "blur-in" });
        tl.set(d1, { visibility: "visible" }, 0.35)
          .fromTo(d1, { letterSpacing: "0.22em" }, { letterSpacing: "-0.045em", duration: 2.1, ease: "expo.out" }, "<")
          .fromTo(
            s1.chars,
            { ...BLUR_IN, y: 50, scale: 1.18, transformOrigin: "50% 100%" },
            { opacity: 1, filter: "blur(0px)", y: 0, scale: 1, duration: 1.25, stagger: 0.05 },
            "<"
          )
          .to(
            s1.chars,
            { ...BLUR_OUT, y: -36, duration: 0.7, ease: "power2.in", stagger: { each: 0.035, from: "random" } },
            "+=0.85"
          )
          .set(d1, { visibility: "hidden" });

        /* ---------- 02 · Welcome to my portfolio + the button ---------- */
        const s2 = new SplitText(line, { type: "words", wordsClass: "blur-in" });
        tl.set(d2, { visibility: "visible" }, "+=0.1").fromTo(
          s2.words,
          { ...BLUR_IN, y: 44 },
          { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.12 },
          "<"
        );
        showButton("-=0.2");
      };

      if (document.fonts && document.fonts.status !== "loaded") {
        document.fonts.ready.then(safe(build));
      } else {
        build();
      }

      /* ---------- Reveal: the button opens an iris onto the site ---------- */
      revealRef.current = safe(() => {
        const el = root.current;
        const r = btnWrap.current.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const max = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 80;
        const state = { r: 0 };
        const paint = () => {
          const edge = Math.max(0, state.r);
          const m = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${edge}px, #000 ${edge + 90}px)`;
          el.style.setProperty("mask-image", m);
          el.style.setProperty("-webkit-mask-image", m);
        };
        paint();
        const tl = gsap.timeline({ onComplete: () => onDone?.() });
        tl.to("[data-line]", { opacity: 0, filter: "blur(18px)", y: -20, duration: 0.7, ease: "power2.in" })
          .to(btnWrap.current, { scale: 1.1, opacity: 0, filter: "blur(10px)", duration: 0.7, ease: "power2.in" }, "<0.1")
          .call(() => onRevealStart?.(), null, "<0.2")
          .to(state, { r: max, duration: 1.7, ease: "expo.inOut", onUpdate: paint }, "<");
      });
    },
    { scope: root }
  );

  const reveal = () => revealRef.current?.();

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[80] overflow-hidden bg-white text-ink"
      style={{ pointerEvents: phase === "site" ? "none" : "auto" }}
    >
      <div className="absolute inset-0 grid place-items-center px-6">
        <p
          data-d="1"
          style={{ visibility: "hidden" }}
          className="absolute text-center text-[clamp(3.4rem,13vw,12rem)] font-medium leading-[0.95] tracking-[-0.045em]"
        >
          Hi! I am <span className="serif italic">Lynx</span>
        </p>

        <div data-d="2" style={{ visibility: "hidden" }} className="absolute flex flex-col items-center text-center">
          <p
            data-line
            className="max-w-[16ch] text-[clamp(2.6rem,8.4vw,8rem)] font-medium leading-[0.98] tracking-[-0.04em] sm:max-w-none"
          >
            Welcome to my <span className="serif italic">portfolio</span>
          </p>
          <div ref={btnWrap} className="mt-12 opacity-0 sm:mt-14">
            <GlassButton phase={phase} loadRef={loadRef} onLoaded={onLoaded} onClick={reveal} />
          </div>
        </div>
      </div>
    </div>
  );
}
