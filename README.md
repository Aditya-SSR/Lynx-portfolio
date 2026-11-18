# Lynx — Portfolio

Next.js 16 · React 19 · GSAP (+SplitText, ScrollTrigger) · Lenis · Three.js / React Three Fiber · Tailwind 4

```bash
npm run dev       # http://localhost:3000
npm run build     # production build
npm run capture   # re-screenshot the live project sites into public/previews
```

## The experience

1. **Preloader** (`src/components/preloader`) — two dialogues on white ("Hi! I am Lynx", "Welcome to my portfolio") and nothing else. The *Enter Portfolio* button appears under the headline as an empty outline and **is the loader**: a thin line traces the pill with the real load progress while the label writes itself, resolving letter by letter out of scrambled characters. At 100% black floods the button, the arrow pops in and you can enter. An iris opens from the button onto the site.
2. **Showcase** (`src/components/work`) — a scroll-driven 3D carousel of tilted floating screens (React Three
   Fiber). Scroll / arrow keys / click a side screen to travel; click the centre screen and it flies to the camera
   while the **real site loads in an iframe** over it. The canvas pauses while a site is open.
   The nav shows only "Showcase" here; the full bar fades in once you scroll past (hover *Index* for the project list).
   After the websites come the **mobile apps** (VSync App, Streaky) as iPhone-style tiles (titanium frame, dynamic island); clicking an app opens its Play Store page / GitHub repo in a new tab. Add apps in `lib/projects.js` with `type: "app", shape: "phone"` and a texture in `public/previews/`.
3. **About → Beyond → Stack** — a scroll-scrubbed blur-to-focus paragraph that ends with an inline "I build ___." whose word changes every second (`BUILDS` in `About.jsx`); **Beyond the browser** (`Beyond.jsx` + `lib/beyond.js`) — the header draws a globe that stretches out into a line underlining "browser." (which fades in above it); fits one screen: as you scroll in, the centre card arrives and the other two slide out from behind it; hover a card and a black panel rises over its lower 60% with the details, sliding back down when you leave (tap on touch). Images live in `public/beyond/` (WebP); then the scrolling tools line (`STACK` in `Stack.jsx`).
4. **Footer** — the last block of the page, in normal document flow (so it scrolls natively and can never lag behind Lenis). Pure black with rounded top corners; huge headline, the email, and a small ASCII emblem (`AsciiLogo.jsx`) whose *same* characters fly from the lynx to the word "LYNX" and back. Text arrives out of blur and replays on scroll-back; the email is typed out letter by letter with a blinking caret.
5. **Cursor** — an instant (no-lag) designed pointer that gives way to an inverting blob over buttons and a
   labelled lens over screens.

## Things you'll want to edit

| What | Where |
| --- | --- |
| Projects (title, URL, stack, copy) | `src/lib/projects.js` |
| Contact email / GitHub | `LINKS` in `src/lib/projects.js` |
| About copy / capabilities | `src/components/About.jsx` |
| Intro dialogues | `src/components/preloader/Preloader.jsx` |
| Screen size / camera | `src/lib/layout.js` |

After adding a project, add its URL to `scripts/capture.mjs` and run `npm run capture <id>`.

## Notes

- Embedding works because the four sites send no `X-Frame-Options` / `frame-ancestors`. A future site that
  does will need *Open in new tab* only.
- A parent element with a CSS `filter` stops `backdrop-filter` from seeing what is behind it — GSAP blur tweens
  on the button wrapper and nav use `clearProps: "filter"` for this reason.
- Never time WebGL animation off the three.js clock: it restarts when the canvas is paused/resumed (this blanked the
  carousel after closing a live site).
- Logo: `public/lynx-logo.png` (dark line-art on white) feeds the footer ASCII logo.
- GSAP agent skills are installed in `.claude/skills` (see `skills-lock.json`).

## Performance notes

- The 3D showcase only renders while it is on (or near) the screen (`Work.jsx` → `Scene active`). A canvas that keeps drawing off-screen starves the rest of the page — it had dropped the footer to ~5 fps.
- On narrow screens (<768px) the carousel ignores the cursor (no parallax / hover-scale / glare drift).

## Deploying (Vercel)

1. Push the repo to GitHub, then **Import Project** on vercel.com. The Next.js preset needs no settings.
2. That's all for a `*.vercel.app` URL: the canonical, Open Graph and sitemap URLs pick up your production domain automatically.
3. With a **custom domain**, add an environment variable `NEXT_PUBLIC_SITE_URL` = `https://your-domain.com` and redeploy.

Requires Node >= 20.9. To try the production build locally: `npm run build`, then `npm run start`.

### What ships

- About 0.9 MB on first load (JS ~480 KB including three.js and GSAP, images ~330 KB, fonts ~60 KB).
- No 3D model files: the carousel's phones and monitors are built from code, and only the WebP screenshots are downloaded.
- Loading starts the moment the page opens, hidden behind the intro dialogues.
- The 3D scene only renders while the showcase is on screen.
- The two app screen recordings (`public/videos`, ~3.8 MB total) are **not** part of the first load. Each one starts downloading only when its phone is about one tile from the centre, plays only while that phone is centred, and is skipped entirely on screens under 768px, with Data Saver on, or with reduced motion (the phone keeps its still image). To swap a recording, replace the file and keep it portrait, H.264, muted, with the index at the start (`-movflags +faststart`).
- Screens narrower than 900px get a one-time "best on a larger screen" notice with a *Continue anyway* button (remembered for the session).
- Static assets (`/previews`, `/beyond`, `/videos`, the logo) are cached for a week with stale-while-revalidate. Security headers are set in `next.config.mjs`.
- The favicon, Apple icon and social-share image are generated from the lynx logo.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run optimize` | Converts new JPG/PNG images in `public/previews` and `public/beyond` to optimized WebP. Run it after adding images. |
| `npm run capture` | Re-screenshots the live project sites into `public/previews` as WebP. Pass an id (for example `npm run capture vero`) to do just one. |
| `npm run brand` | Regenerates the favicon, Apple icon and share image from `design/lynx-logo.original.png`. |

`design/lynx-logo.original.png` is your full-resolution logo. The copy in `public/` is a small one used only to draw the ASCII emblem.
