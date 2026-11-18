// The site's public URL. On Vercel this is picked up automatically from the production domain;
// set NEXT_PUBLIC_SITE_URL if you attach a custom domain (e.g. https://lynx.dev).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Lynx-Portfolio";
export const SITE_DESCRIPTION =
  "Portfolio of Lynx — MERN full stack developer, app developer and aspiring AI engineer crafting award-level interfaces with motion and 3D.";
