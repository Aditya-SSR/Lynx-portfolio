"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { isTouch } from "@/lib/motion";
import { useStore } from "@/lib/store";

/**
 * Custom cursor, difference-blended so it inverts whatever is under it.
 *  - idle:   a sharp designed pointer (tip = hotspot)
 *  - hover:  the pointer gives way to an inverting blob over buttons and links
 *  - screens: the blob grows into a labelled lens ("Open" / "View")
 * Position is written straight from the pointer event — no smoothing, no lag.
 */
// The arrow's visual centre, in px from the pointer hotspot (its tip). The blob is born here, so it grows out
// of the middle of the arrow (which collapses into the same point), then eases to the true pointer position.
const CENTER = { x: 5.4, y: 10.3 };

export default function Cursor() {
  const root = useRef(null);
  const arrow = useRef(null);
  const blob = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    if (isTouch()) return;
    const el = root.current;
    gsap.set(blob.current, { xPercent: -50, yPercent: -50, width: 0, height: 0, x: CENTER.x, y: CENTER.y });
    gsap.set(arrow.current, { transformOrigin: "7.4px 12.3px" }); // collapse toward its own middle

    let shown = false;
    const move = (e) => {
      if (useStore.getState().opened) return;
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!shown) {
        shown = true;
        el.style.opacity = "1";
      }
    };

    let text = null;
    const apply = (mode) => {
      const to = { duration: 0.35, ease: "power3.out", overwrite: "auto" };
      if (mode === "label") {
        gsap.to(blob.current, { width: 92, height: 92, x: 0, y: 0, ...to });
        gsap.to(label.current, { opacity: 1, duration: 0.3, delay: 0.08 });
        gsap.to(arrow.current, { scale: 0, opacity: 0, duration: 0.2, overwrite: "auto" });
      } else if (mode === "hover") {
        gsap.to(blob.current, { width: 46, height: 46, x: 0, y: 0, ...to });
        gsap.to(label.current, { opacity: 0, duration: 0.12 });
        gsap.to(arrow.current, { scale: 0, opacity: 0, duration: 0.2, overwrite: "auto" });
      } else {
        gsap.to(blob.current, { width: 0, height: 0, x: CENTER.x, y: CENTER.y, ...to });
        gsap.to(label.current, { opacity: 0, duration: 0.12 });
        gsap.to(arrow.current, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)", overwrite: "auto" });
      }
    };

    const onCursor = (e) => {
      text = e.detail;
      if (text) {
        label.current.textContent = text;
        apply("label");
      } else apply("idle");
    };
    const over = (e) => {
      if (text) return;
      if (e.target.closest?.("[data-cursor],a,button")) apply("hover");
    };
    const out = (e) => {
      if (text) return;
      if (e.target.closest?.("[data-cursor],a,button")) apply("idle");
    };
    const leave = () => {
      shown = false;
      el.style.opacity = "0";
    };

    const html = document.documentElement;
    html.classList.add("has-cursor");
    // Pointer events go to the iframe while a site is open, so hand back the native cursor.
    const unsub = useStore.subscribe((s) => {
      html.classList.toggle("viewer-open", s.opened != null);
      if (s.opened != null) {
        shown = false;
        el.style.opacity = "0";
      }
    });

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("cursor", onCursor);
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    html.addEventListener("mouseleave", leave);
    return () => {
      unsub();
      html.classList.remove("has-cursor", "viewer-open");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("cursor", onCursor);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      html.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden
      className="cursor-only pointer-events-none fixed left-0 top-0 z-[100] opacity-0 mix-blend-difference"
      style={{ willChange: "transform" }}
    >
      {/* pointer: tip sits exactly on the hotspot */}
      <svg
        ref={arrow}
        width="22"
        height="26"
        viewBox="0 0 22 26"
        fill="none"
        className="absolute overflow-visible"
        style={{ left: -2, top: -2 }}
      >
        <path
          d="M2 2 L2 19.2 L6.3 15.1 L9.4 22.2 L12.5 20.9 L9.4 13.9 L15.4 13.5 Z"
          fill="#fff"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>

      {/* inverting blob */}
      <div ref={blob} className="absolute left-0 top-0 grid place-items-center rounded-full bg-white">
        <span ref={label} className="eyebrow text-[0.6rem] text-black opacity-0" />
      </div>
    </div>
  );
}
