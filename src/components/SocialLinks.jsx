import { LINKS } from "@/lib/projects";
import { SOCIAL_ICONS } from "@/lib/social-icons";

const ITEMS = [
  { id: "instagram", label: "Instagram", href: LINKS.instagram },
  { id: "github", label: "GitHub", href: LINKS.github },
  { id: "linkedin", label: "LinkedIn", href: LINKS.linkedin },
];

/** Three monochrome social logos — no heading, no labels. White on the black footer. */
export default function SocialLinks({ className = "" }) {
  return (
    <ul className={`flex items-center gap-5 sm:gap-6 ${className}`} aria-label="Social links">
      {ITEMS.map((s) => (
        <li key={s.id}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            data-cursor="hover"
            className="block text-white/75 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" aria-hidden>
              <path d={SOCIAL_ICONS[s.id]} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
