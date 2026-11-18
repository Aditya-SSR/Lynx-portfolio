"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// The word at the end of the paragraph ("I build ___.") cycles through these, once a second.
const BUILDS = ["interfaces", "systems", "apps", "AI"];
const INTERVAL = 1000;

export default function About() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      // Paragraph: every word pulls focus as you scroll past it (the rotating word is left out).
      const split = new SplitText("[data-statement]", { type: "words", wordsClass: "blur-in", ignore: "[data-reel]" });
      const reel = root.current.querySelector('[data-reel]');
      gsap.fromTo(
        [...split.words, reel],
        { opacity: 0.12, filter: "blur(9px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: "[data-statement]", start: "top 82%", end: "bottom 48%", scrub: 0.6 },
        }
      );

      // "I build ___": the inline word changes every second, through a quick blur. On screen only.
      const words = gsap.utils.toArray("[data-bword]");
      gsap.set(words, { opacity: 0 });
      gsap.set(words[0], { opacity: 1 });
      let cur = 0;
      const swap = () => {
        const from = cur;
        const to = (cur + 1) % BUILDS.length;
        cur = to;
        gsap.to(words[from], { opacity: 0, yPercent: -35, filter: "blur(10px)", duration: 0.28, ease: "power2.in", overwrite: true });
        gsap.fromTo(
          words[to],
          { opacity: 0, yPercent: 35, filter: "blur(10px)" },
          { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: 0.4, delay: 0.14, ease: "power3.out", overwrite: true }
        );
      };
      let timer;
      const io = new IntersectionObserver(([e]) => {
        clearInterval(timer);
        if (e.isIntersecting) timer = setInterval(swap, INTERVAL);
      });
      io.observe(root.current.querySelector("[data-statement]"));
      return () => {
        clearInterval(timer);
        io.disconnect();
      };
    },
    { scope: root }
  );

  return (
    <section id="about" ref={root} className="relative px-6 pb-[18vh] pt-[22vh] sm:px-10">
      <p
        data-statement
        className="max-w-[1250px] text-[clamp(1.9rem,5.1vw,4.9rem)] font-medium leading-[1.04] tracking-[-0.04em]"
      >
        I&rsquo;m Lynx &mdash; a full stack developer who builds the <span className="serif italic">whole</span> thing.
        The MERN engine underneath, and the motion, 3D and detail on the surface. I chase interfaces that feel{" "}
        <span className="serif italic">alive</span>, and I&rsquo;m growing into an AI engineer.{" "}
        {/* "I build" and the cycling word are one unit: they wrap together, never apart */}
        <span className="whitespace-nowrap">
        I build{" "}
        {/* all words share one grid cell, so the slot is always as wide as the longest one */}
        <span data-reel className="serif inline-grid align-baseline italic">
          {BUILDS.map((w) => (
            <span key={w} data-bword className="whitespace-nowrap" style={{ gridArea: "1 / 1" }}>
              {w}.
            </span>
          ))}
        </span>
        </span>
      </p>
    </section>
  );
}
