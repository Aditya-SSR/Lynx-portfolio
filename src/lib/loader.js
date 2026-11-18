import { PROJECTS } from "@/lib/projects";

/**
 * Loads everything the site needs and reports honest progress (0..1).
 * Tasks: webfonts, the heavy 3D scene chunk, and every project preview.
 * The returned promise resolves once all tasks have finished.
 */
export function loadSite(onProgress) {
  const tasks = [];
  let done = 0;
  const total = () => tasks.length;
  const bump = () => {
    done += 1;
    onProgress?.(done / total());
  };
  const track = (p) => {
    tasks.push(p);
    return p;
  };

  const fonts = document.fonts?.ready ?? Promise.resolve();
  track(fonts.then(bump, bump));

  // Warm the 3D chunk (three + r3f) so mounting it later is instant.
  track(import("@/components/work/Scene").then(bump, bump));

  for (const p of PROJECTS) {
    track(
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = img.onerror = () => {
          bump();
          resolve();
        };
        img.src = p.preview;
      })
    );
  }

  return Promise.all(tasks);
}
