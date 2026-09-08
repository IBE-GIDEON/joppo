export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden fill="none">
        <defs>
          <linearGradient id="jp" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9B87FF" />
            <stop offset="1" stopColor="#5A2FE8" />
          </linearGradient>
        </defs>
        <path
          d="M4 3h16v3.2H4zM4 10.4h10.5v3.2H4zM4 17.8h16V21H4z"
          fill="url(#jp)"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-white">Joppo</span>
    </span>
  );
}
