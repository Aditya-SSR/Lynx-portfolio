"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { LINKS } from "@/lib/projects";
import { FOOTER_H } from "@/lib/layout";
import { prefersReducedMotion } from "@/lib/motion";
import AsciiLogo from "./AsciiLogo";
import SocialLinks from "./SocialLinks";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * Footer — the last block of the page, in normal document flow. Because the browser scrolls it
 * natively it rises up from the bottom exactly in step with the page (no scroll-driven offset
 * to lag behind Lenis, so it stays rock-solid even when you scroll fast). Pure black with
 * rounded top corners: a huge headline, a small living ASCII emblem and the email.
 */
export default function Footer() {
  const root = useRef(null);
  const inner = useRef(null);
  const [active, setActive] = useState(false);

  // only animate the ASCII canvas while the footer is on screen
  useEffect(() => {
    const el = root.current;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      // content drifts up a touch further than the panel as it arrives, for depth
      gsap.fromTo(
        inner.current,
        { yPercent: 8 },
        {
          yPercent: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: true },
        }
      );

      // text arrives out of blur (and plays again if you scroll back up and return)
      const split = new SplitText("[data-ft-title]", { type: "words", wordsClass: "blur-in" });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 62%", toggleActions: "play none none reverse" },
      });
      tl.from(split.words, { opacity: 0, y: 70, filter: "blur(18px)", duration: 1.2, stagger: 0.09, ease: "power3.out" }).from(
        "[data-ft-in]",
        { opacity: 0, y: 24, filter: "blur(12px)", duration: 1, stagger: 0.12, ease: "power3.out" },
        "-=0.8"
      );

      // the email is typed out, one letter at a time: each letter sharpens out of blur, a caret
      // follows the last one and blinks a few times before it goes (the link and its underline
      // grow with the text)
      const mail = new SplitText("[data-email]", { type: "chars", charsClass: "mail-char" });
      tl.set("[data-caret]", { opacity: 1 }, ">-0.45")
        .fromTo(
          mail.chars,
          { display: "none", opacity: 0, filter: "blur(8px)" },
          { display: "inline-block", opacity: 1, filter: "blur(0px)", duration: 0.3, stagger: 0.055, ease: "power2.out" },
          "<"
        )
        .fromTo("[data-caret]", { opacity: 1 }, { opacity: 0, duration: 0.4, repeat: 4, yoyo: true, ease: "steps(1)" }, ">");
    },
    { scope: root }
  );

  return (
    <footer
      id="contact"
      ref={root}
      className="relative overflow-hidden rounded-t-[28px] bg-black text-white sm:rounded-t-[44px]"
      style={{ height: FOOTER_H }}
    >
      <div
        ref={inner}
        className="relative flex h-full flex-col justify-between px-6 pb-[clamp(32px,7vh,72px)] pt-[clamp(72px,12vh,140px)] sm:px-10"
      >
        {/* headline + emblem */}
        <div className="flex flex-1 flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10">
          <h2
            data-ft-title
            className="max-w-[12ch] text-[clamp(2.9rem,8.4vw,9.6rem)] font-medium leading-[0.9] tracking-[-0.055em]"
          >
            Let&rsquo;s build something people <span className="serif italic">remember.</span>
          </h2>

          <div
            data-ft-in
            className="relative -mt-2 h-[170px] w-full shrink-0 md:mt-0 md:h-[min(24vw,330px)] md:w-[min(24vw,330px)]"
          >
            <AsciiLogo src="/lynx-logo.png" active={active} label="Lynx logo drawn in ASCII characters" />
          </div>
        </div>

        {/* email */}
        <div className="mt-6 flex items-end justify-between gap-5">
          <div data-ft-in>
          <a
            href={`mailto:${LINKS.email}`}
            data-cursor="hover"
            className="group relative inline-block break-all text-[clamp(1.25rem,4.1vw,4.4rem)] leading-none tracking-[-0.045em]"
          >
            <span data-email>{LINKS.email}</span>
            <span
              data-caret
              aria-hidden
              className="ml-[0.06em] inline-block h-[0.8em] w-[0.06em] translate-y-[0.08em] bg-white opacity-0"
            />
            <span className="absolute -bottom-2 left-0 h-px w-full origin-left bg-white transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:origin-right group-hover:scale-x-0" />
          </a>
          </div>
          {/* three logos, bottom right — no heading */}
          <div data-ft-in className="shrink-0 pb-1">
            <SocialLinks />
          </div>
        </div>
      </div>
    </footer>
  );
}
