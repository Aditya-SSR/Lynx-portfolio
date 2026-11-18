// Shrinks the site's images for production. Safe to re-run; it only touches files that still need it.
//   npm run optimize
//
//  - public/previews/*.jpg|png  -> .webp  (carousel textures; web previews capped at 1280px wide)
//  - public/beyond/*.jpg|png    -> .webp  (project photos; capped at 1100px wide)
//  - public/lynx-logo.png       -> resized + palette PNG (it only feeds the ASCII sampler); the original
//                                   is kept in design/lynx-logo.original.png
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (...p) => path.join(root, "public", ...p);
const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + " KB";

async function toWebp(dir, maxWidth, quality) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png)$/i.test(name)) continue;
    const src = path.join(dir, name);
    const out = path.join(dir, name.replace(/\.(jpe?g|png)$/i, ".webp"));
    const before = kb(src);
    const meta = await sharp(src).metadata();
    const isPhone = meta.height > meta.width; // app textures are portrait: keep their size
    await sharp(src)
      .resize({ width: isPhone ? meta.width : Math.min(maxWidth, meta.width), withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toFile(out);
    fs.unlinkSync(src);
    console.log(`${path.relative(root, src).padEnd(34)} ${before.padStart(7)}  ->  ${path.relative(root, out).padEnd(34)} ${kb(out).padStart(7)}`);
  }
}

await toWebp(pub("previews"), 1280, 80);
await toWebp(pub("beyond"), 1100, 82);

// the lynx logo: dark line-art on white, only used to be sampled into characters
const logo = pub("lynx-logo.png");
if (fs.existsSync(logo)) {
  const meta = await sharp(logo).metadata();
  if (meta.width > 700) {
    fs.mkdirSync(path.join(root, "design"), { recursive: true });
    const keep = path.join(root, "design", "lynx-logo.original.png");
    if (!fs.existsSync(keep)) fs.copyFileSync(logo, keep);
    const before = kb(logo);
    const buf = await sharp(logo).resize({ width: 640 }).greyscale().png({ palette: true, colors: 32, compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(logo, buf);
    console.log(`public/lynx-logo.png ${before} -> ${kb(logo)} (original kept in design/)`);
  }
}
