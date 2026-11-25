import { useEffect, useState } from 'react';

interface IntroScreenProps {
  onDone: () => void;
}

export default function IntroScreen({ onDone }: IntroScreenProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700"
      style={{
        opacity: phase >= 2 ? 0 : 1,
        pointerEvents: phase >= 2 ? 'none' : 'auto',
        background: 'linear-gradient(135deg, hsl(234 89% 60% / 0.05), hsl(var(--background)), hsl(280 60% 55% / 0.03))',
      }}
    >
      <div className={`text-center transition-all duration-700 ${phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        {/* Logo mark */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-[1.25rem] bg-primary/10 flex items-center justify-center">
          <span className="text-3xl font-black text-primary tracking-tighter">tS</span>
        </div>

        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          tydar<span className="text-primary">SU</span>
        </h1>

        <p className={`text-sm text-muted-foreground mt-3 font-medium transition-all duration-500 delay-300 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          Build apps, visually.
        </p>

        {/* Loading bar */}
        <div className={`mx-auto mt-8 h-1 rounded-full bg-border overflow-hidden w-32 transition-all duration-500 delay-500 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-full bg-primary rounded-full animate-shimmer" style={{ width: '60%', background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(280 60% 55%), hsl(var(--primary)))' }} />
        </div>
      </div>
    </div>
  );
}
