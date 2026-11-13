import fs from "node:fs";
import path from "node:path";

// The society's round logo. Put the real logo at /public/logo.png (square,
// transparent background — the same one used on thwics.com) and it is used
// everywhere: header, footer, login, landing page and the printed form.
// Until then a simple placeholder medallion is shown.
const LOGO = path.join(process.cwd(), "public", "logo.png");

export function Emblem({ className = "h-11 w-11" }: { className?: string }) {
  if (fs.existsSync(LOGO)) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny static file; next/image adds nothing here
    return <img src="/logo.png" alt="" aria-hidden="true" className={`${className} rounded-full object-contain`} />;
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="emb-g" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#f6a03f" />
          <stop offset="1" stopColor="#d9542c" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="#e9b13b" />
      <circle cx="24" cy="24" r="20.5" fill="url(#emb-g)" />
      <circle cx="24" cy="24" r="15" fill="none" stroke="#fbe3a6" strokeWidth="1" opacity=".7" />
      <path d="M24 12c3.5 4 3.5 10 0 15-3.5-5-3.5-11 0-15z" fill="#7b2525" />
      <path d="M24 27c-1-5.5-4.6-9.2-9.5-10 .2 5.6 3.8 9.4 9.5 10z" fill="#9d2f22" />
      <path d="M24 27c1-5.5 4.6-9.2 9.5-10-.2 5.6-3.8 9.4-9.5 10z" fill="#9d2f22" />
      <path d="M15 31h18M18 34.5h12" stroke="#fbe3a6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
