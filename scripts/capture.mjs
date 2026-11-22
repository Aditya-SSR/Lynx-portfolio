// Captures a hero screenshot of each live project into /public/previews.
// Usage: npm run capture [id ...]      (uses your installed Edge/Chrome)
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public", "previews");
fs.mkdirSync(out, { recursive: true });

const SITES = {
  vero: "https://vero-ten.vercel.app/",
  struct: "https://struct-gamma.vercel.app/",
  northwind: "https://northwind-zeta.vercel.app/",
  hush: "https://hush-sepia.vercel.app/",
  vsync: "https://v-sync-minimallabs.vercel.app/",
  yestalgia: "https://yestalgia-reubild.vercel.app/",
};

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const executablePath = process.env.BROWSER || BROWSERS.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found. Set BROWSER=/path/to/chrome");

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : Object.keys(SITES);
const WAIT = Number(process.env.WAIT || 7000); // let intros / preloaders finish

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

for (const id of ids) {
  const url = SITES[id];
  if (!url) continue;
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  } catch (e) {
    console.warn(`[${id}] navigation warning:`, e.message);
  }
  await new Promise((r) => setTimeout(r, WAIT));
  const file = path.join(out, `${id}.webp`);
  const shot = await page.screenshot({ type: "jpeg", quality: 90 });
  await sharp(shot).resize({ width: 1280 }).webp({ quality: 80, effort: 6 }).toFile(file);
  console.log(`captured ${id} -> ${path.relative(root, file)}`);
  await page.close();
}
await browser.close();
