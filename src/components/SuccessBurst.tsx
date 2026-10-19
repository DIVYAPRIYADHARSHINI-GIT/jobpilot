// Success animation after a submission: a check circle that draws itself,
// a paper plane flying off and a small CSS confetti burst (no JS loop).
const DOTS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  const d = 70 + (i % 3) * 18;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, c: ["#6366f1", "#22c55e", "#f59e0b", "#06b6d4", "#ec4899"][i % 5], delay: (i % 4) * 40 };
});

export function SuccessBurst() {
  return (
    <div className="relative mx-auto h-36 w-36" data-testid="success-animation" aria-hidden="true">
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="animate-burst absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: d.c, ["--dx" as string]: `${d.dx}px`, ["--dy" as string]: `${d.dy}px`, animationDelay: `${d.delay}ms` }}
        />
      ))}
      <svg viewBox="0 0 120 120" className="animate-pop-in absolute inset-0 h-full w-full">
        <circle cx="60" cy="60" r="44" fill="#dcfce7" />
        <circle cx="60" cy="60" r="44" fill="none" stroke="#16a34a" strokeWidth="6" />
        <path d="M40 61 54 75 81 46" fill="none" stroke="#16a34a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" className="animate-draw" />
      </svg>
      <svg viewBox="0 0 60 44" className="animate-fly absolute -right-8 top-0 h-10 w-12" style={{ animationDelay: "250ms" }}>
        <path d="M2 20 L58 2 L40 42 L28 28 Z" fill="#fff" stroke="#4f46e5" strokeWidth="3" strokeLinejoin="round" />
        <path d="M28 28 L58 2" stroke="#4f46e5" strokeWidth="3" />
      </svg>
    </div>
  );
}
