"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { useGSAP } from "@gsap/react";
import { BEYOND } from "@/lib/beyond";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, MorphSVGPlugin);

/**
 * One card: the image fills it. On hover a black panel rises over the bottom ~60% with the
 * details, and slides back down smoothly when the pointer leaves. On touch, tap toggles it.
 * Landscape (5:4) to suit the project images.
 */
function Card({ item }) {
  const [open, setOpen] = useState(false); // touch / keyboard toggle
  const [hasImage, setHasImage] = useState(false);

  // Probe for the image on the client; the placeholder stays until a real file loads.
  // (An <img> that fails during SSR never fires React's onError, so we can't rely on it.)
  useEffect(() => {
    const probe = new Image();
    probe.onload = () => setHasImage(true);
    probe.src = item.image;
  }, [item.image]);

  return (
    <article
      data-card
      data-open={open}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={`${item.title} — show details`}
      data-cursor="hover"
      onPointerUp={(e) => e.pointerType !== "mouse" && setOpen((o) => !o)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((o) => !o))}
      className="group relative aspect-[5/4] max-h-[62vh] w-full cursor-pointer overflow-hidden rounded-[20px] bg-ink shadow-[0_36px_60px_-34px_rgba(0,0,0,0.55)] outline-none sm:rounded-[26px]"
    >
      {/* image (slow zoom while the panel is up) */}
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={`${item.title} — project image`}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] group-data-[open=true]:scale-[1.06]"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${item.tone[0]}, ${item.tone[1]})` }}>
          <p className="serif absolute inset-x-6 top-[38%] text-[clamp(2rem,3.6vw,3.6rem)] italic leading-[0.95] tracking-[-0.03em] text-ink/80">
            {item.title}
          </p>
        </div>
      )}

      {/* resting label */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <p className="pointer-events-none absolute bottom-5 left-6 flex items-baseline gap-3 text-white">
        <span className="serif text-[1.6rem] leading-none">{item.index}</span>
        <span className="eyebrow text-white/85">{item.title}</span>
      </p>

      {/* details panel */}
      <div
        className="absolute inset-x-0 bottom-0 flex min-h-[60%] translate-y-full flex-col justify-between bg-ink px-6 pb-5 pt-5 text-white transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-data-[open=true]:translate-y-0"
      >
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <p className="eyebrow text-white/55">{item.kind}</p>
            <p className="serif text-[1.2rem] leading-none text-white/55">{item.index}</p>
          </div>
          <h3 className="serif mt-2 text-[clamp(1.6rem,2.3vw,2.5rem)] uppercase leading-[0.95] tracking-[-0.01em]">{item.title}</h3>
          <p className="mt-1.5 text-[0.92rem] leading-[1.3] tracking-[-0.01em] text-white/70">{item.line}</p>
        </div>

        <div>
          {item.stats.length > 0 && (
            <div className="mb-2.5 mt-3 flex gap-6">
              {item.stats.map((s) => (
                <p key={s.label} className="flex items-baseline gap-2">
                  <span className="serif text-[1.7rem] italic leading-none">{s.value}</span>
                  <span className="eyebrow text-[0.6rem] text-white/55">{s.label}</span>
                </p>
              ))}
            </div>
          )}
          <ul className={item.stats.length ? "" : "mt-3"}>
            {item.role.map((r) => (
              <li key={r} className="border-t border-white/15 py-1.5 text-[0.86rem] leading-[1.25] tracking-[-0.01em] text-white/90">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

/**
 * Beyond the browser — fits one screen.
 *  Header: "Beyond the" blurs in, then a globe draws itself, spins, and every stroke of it morphs into one straight line that
 *  slides under the word "browser." (same serif italic) as an underline; the word fades in above it. Scrolling on pins the section and the three cards fan out of the
 *  middle one; once they are in place the line below them blurs in at the bottom right.
 *  (On phones the cards simply stack and fade in.)
 */
export default function Beyond() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      /* ---------- header: a globe whose lines morph into a line that underlines "browser." ---------- */
      const pre = new SplitText("[data-bt-pre]", { type: "words", wordsClass: "blur-in" });
      const chars = new SplitText("[data-word]", { type: "chars", charsClass: "blur-in" }).chars;
      const parts = gsap.utils.toArray("[data-gp]");
      const wordBox = root.current.querySelector("[data-browser]");
      const globe = root.current.querySelector("[data-globe]");
      // Explicit hidden start state for EVERYTHING in the header. (A staggered from() only hides the first
      // target up front — later words stay visible until the animation starts, which is how "the" leaked
      // into view from the previous section.)
      gsap.set(pre.words, { opacity: 0, y: 50, filter: "blur(14px)" });
      gsap.set(chars, { opacity: 0 });
      gsap.set(parts, { strokeDasharray: 1, strokeDashoffset: 1 });

      const hdr = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 62%", toggleActions: "play none none reverse", invalidateOnRefresh: true },
      });
      hdr
        .to(pre.words, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.12, ease: "power3.out" }, 0)
        // the globe draws itself line by line...
        .set(globe, { opacity: 1 }, 0.35)
        .to(parts, { strokeDashoffset: 0, duration: 0.9, stagger: 0.07, ease: "power2.inOut" }, 0.35)
        // ...spins (the meridian narrows and widens)...
        .to("[data-meridian]", { scaleX: 0.18, svgOrigin: "50 50", duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, 1.15)
        // ...then every stroke of it morphs into one straight line: the circle flattens, the vertical axis
        // lays itself down, the latitudes straighten — they all become the same horizontal line
        .to(parts, { morphSVG: "M4 50H96", duration: 1.1, stagger: 0.06, ease: "power3.inOut" }, 2.0)
        // that line then slides down to the baseline and stretches to the width of the word
        .set(parts, { strokeLinecap: "butt" }, 2.85)
        .to(parts, { strokeWidth: 3.4, duration: 0.6, ease: "power2.out" }, 2.85)
        .to(
          globe,
          {
            scaleX: () => wordBox.offsetWidth / (globe.getBoundingClientRect().width * 0.92),
            y: () => wordBox.offsetHeight * 0.5 + 6, // GSAP owns the transform here, so the svg is centred with margins (a CSS translate gets dropped)
            duration: 1.0,
            ease: "power3.inOut",
            transformOrigin: "50% 50%",
          },
          2.85
        )
        // ...and the word fades in above the line
        .to(chars, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.05, ease: "power3.out" }, 3.5);
      gsap.set(chars, { y: 16, filter: "blur(12px)" });

      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        const cards = gsap.utils.toArray("[data-card]");
        const grid = root.current.querySelector("[data-cards]");
        // how far a side card sits from the centre one (card width + the grid gap)
        const spread = (i) => () => {
          const gap = parseFloat(getComputedStyle(grid).columnGap) || 24;
          return -(i - 1) * (cards[1].offsetWidth + gap);
        };
        gsap.set(cards, { zIndex: (i) => (i === 1 ? 3 : 1), willChange: "transform" });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1, // eased, so a fast scroll can never make the cards snap in
            invalidateOnRefresh: true,
            // hover is only live once the cards have settled into place
            onUpdate: (self) => (grid.style.pointerEvents = self.progress > 0.9 ? "auto" : "none"),
          },
        });
        // The header animates on its own (above), so the first 0.5 of this timeline is deliberately
        // empty: the header gets a beat to itself before any card moves.
        tl.from(cards[1], { opacity: 0, y: 110, scale: 0.86, filter: "blur(22px)", duration: 0.9, ease: "power3.out" }, 0.6)
          // ...then the other two slide out from behind it, coming into focus as they go
          .fromTo([cards[0], cards[2]], { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "none" }, 1.45)
          .fromTo(cards[0], { x: spread(0), rotation: -5, scale: 0.92, filter: "blur(14px)" }, { x: 0, rotation: 0, scale: 1, filter: "blur(0px)", duration: 1.0 }, 1.45)
          .fromTo(cards[2], { x: spread(2), rotation: 5, scale: 0.92, filter: "blur(14px)" }, { x: 0, rotation: 0, scale: 1, filter: "blur(0px)", duration: 1.0 }, 1.45)
          // ...and once they are in place, the line below blurs in at the bottom right
          .from("[data-beyond-sub]", { opacity: 0, y: 24, filter: "blur(12px)", duration: 0.5, ease: "power3.out" }, 2.3)
          .to({}, { duration: 0.4 }); // hold on the finished layout
      });

      mm.add("(max-width: 767px)", () => {
        gsap.utils.toArray("[data-card]").forEach((c) =>
          gsap.from(c, { opacity: 0, y: 60, filter: "blur(14px)", duration: 1.3, ease: "power3.out", scrollTrigger: { trigger: c, start: "top 90%" } })
        );
        gsap.from("[data-beyond-sub]", {
          opacity: 0,
          y: 24,
          filter: "blur(12px)",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-beyond-sub]", start: "top 92%" },
        });
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section id="beyond" ref={root} className="relative md:h-[380vh]" aria-label="Beyond the browser">
      <div className="px-6 py-[12vh] sm:px-10 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-center md:py-0 md:pb-8 md:pt-[84px]">
        <div data-beyond-head className="mb-8 text-center md:mb-9">
          <h2 data-beyond-title className="text-[clamp(2.6rem,5.8vw,6.2rem)] font-medium leading-[0.95] tracking-[-0.055em]">
            <span data-bt-pre>Beyond the</span>{" "}
            <span data-browser className="relative inline-block">
              {/* the globe: draws itself, spins, then opens into the word */}
              <svg
                data-globe
                aria-hidden
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                className="pointer-events-none absolute left-1/2 top-1/2 -ml-[0.475em] -mt-[0.475em] h-[0.95em] w-[0.95em] overflow-visible opacity-0"
              >
                {/* every part is a plain <path>, so they can all morph into the same line */}
                <path data-gp d="M4 50a46 46 0 1 0 92 0a46 46 0 1 0 -92 0" pathLength="1" />
                <path data-gp data-meridian d="M30 50a20 46 0 1 0 40 0a20 46 0 1 0 -40 0" pathLength="1" />
                <path data-gp d="M50 4V96" pathLength="1" />
                <path data-gp d="M4 50H96" pathLength="1" />
                <path data-gp d="M11 29Q50 41 89 29" pathLength="1" />
                <path data-gp d="M11 71Q50 59 89 71" pathLength="1" />
              </svg>
              <span data-word className="serif italic">browser.</span>
            </span>
          </h2>
        </div>

        <div className="mx-auto w-full max-w-[1500px]">
          <div data-cards className="grid gap-4 md:grid-cols-3 md:gap-6">
            {BEYOND.map((item) => (
              <Card key={item.id} item={item} />
            ))}
          </div>
          <p
            data-beyond-sub
            className="ml-auto mt-6 max-w-[34ch] text-right text-[clamp(0.95rem,1.15vw,1.15rem)] leading-[1.4] tracking-[-0.01em] text-ink-soft md:mt-5"
          >
            Projects from college &mdash; group builds, machine learning and an entrepreneurship venture.
          </p>
        </div>
      </div>
    </section>
  );
}
