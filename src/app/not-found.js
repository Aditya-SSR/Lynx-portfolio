import Link from "next/link";

export const metadata = { title: "Lost — Lynx-Portfolio", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6 text-center text-ink">
      <div>
        <p className="eyebrow mb-6 text-ink-soft">404</p>
        <h1 className="text-[clamp(3rem,10vw,9rem)] font-medium leading-[0.9] tracking-[-0.055em]">
          This page <span className="serif italic">wandered off.</span>
        </h1>
        <Link
          href="/"
          className="mt-12 inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 text-[1.05rem] font-semibold tracking-[-0.01em] text-white transition-transform duration-500 hover:-translate-y-0.5"
        >
          Back to the portfolio
          <span aria-hidden>&rarr;</span>
        </Link>
      </div>
    </main>
  );
}
