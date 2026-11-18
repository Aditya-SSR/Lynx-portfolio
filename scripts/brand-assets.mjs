// Generates the favicon / Apple icon / social-share image from the lynx logo.
//   npm run brand
import sharp from "sharp";
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = (f) => path.join(root, "src", "app", f);
const source = fs.existsSync(path.join(root, "design", "lynx-logo.original.png"))
  ? path.join(root, "design", "lynx-logo.original.png")
  : path.join(root, "public", "lynx-logo.png");

// 1) icons: the lynx, trimmed to its own bounds, centred on white with breathing room
async function icon(size, name) {
  const trimmed = await sharp(source).trim({ threshold: 40 }).toBuffer();
  const inner = Math.round(size * 0.66);
  const lynx = await sharp(trimmed).resize({ width: inner, height: inner, fit: "inside" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: "#ffffff" } })
    .composite([{ input: lynx, gravity: "centre" }])
    .png({ compressionLevel: 9, palette: true, colors: 48 })
    .toFile(app(name));
  console.log("wrote src/app/" + name);
}
await icon(192, "icon.png");
await icon(180, "apple-icon.png");
if (fs.existsSync(app("favicon.ico"))) {
  fs.unlinkSync(app("favicon.ico")); // the create-next-app default
  console.log("removed the default favicon.ico");
}

// 2) social share image (1200x630), rendered in the site's own typefaces
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const executablePath = process.env.BROWSER || BROWSERS.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error("No Chrome/Edge found. Set BROWSER=/path/to/chrome");
const logo64 = (await sharp(path.join(root, "public", "lynx-logo.png")).trim({ threshold: 40 }).png().toBuffer()).toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600&family=Instrument+Serif:ital@1&display=block" rel="stylesheet">
<style>
  *{margin:0;box-sizing:border-box} body{width:1200px;height:630px;background:#f4f4f2;display:flex;align-items:center;font-family:'Instrument Sans',sans-serif;color:#0b0b0b;overflow:hidden}
  .logo{width:420px;height:630px;display:flex;align-items:center;justify-content:center;padding-left:60px}
  .logo img{height:330px;mix-blend-mode:multiply}
  .text{padding-left:70px}
  h1{font-weight:600;font-size:210px;letter-spacing:-12px;line-height:.9}
  p{margin-top:26px;font-family:'Instrument Serif',serif;font-style:italic;font-size:58px;letter-spacing:-1px}
  small{display:block;margin-top:34px;font-size:22px;letter-spacing:.14em;text-transform:uppercase;opacity:.55;font-weight:500}
</style></head><body>
<div class="logo"><img src="data:image/png;base64,${logo64}"></div>
<div class="text"><h1>Lynx</h1><p>Full Stack Developer</p><small>MERN · Apps · AI · Motion &amp; 3D</small></div>
</body></html>`;

const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 400));
const shot = await page.screenshot({ type: "png" });
await browser.close();
await sharp(shot).png({ compressionLevel: 9, palette: true, colors: 64 }).toFile(app("opengraph-image.png"));
fs.copyFileSync(app("opengraph-image.png"), app("twitter-image.png"));
console.log("wrote src/app/opengraph-image.png + twitter-image.png");
