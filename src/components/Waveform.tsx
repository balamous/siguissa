import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  bars?: number;
  playing?: boolean;
  progress?: number; // 0-1
  className?: string;
  seed?: string;
}

export const Waveform = ({ bars = 64, playing = false, progress = 0, className, seed = "x" }: WaveformProps) => {
  const heights = useMemo(() => {
    // deterministic pseudo-random
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return Array.from({ length: bars }, (_, i) => {
      h = (h * 9301 + 49297) % 233280;
      const r = h / 233280;
      const wave = 0.4 + 0.6 * Math.abs(Math.sin((i / bars) * Math.PI * 3 + r * 2));
      return wave * (0.6 + r * 0.4);
    });
  }, [bars, seed]);

  return (
    <div className={cn("flex items-center justify-between gap-[2px] h-16 w-full", className)}>
      {heights.map((h, i) => {
        const filled = i / bars <= progress;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              filled ? "bg-gradient-to-t from-primary to-primary-glow" : "bg-muted",
              playing && "animate-wave",
            )}
            style={{
              height: `${h * 100}%`,
              minHeight: 4,
              animationDelay: playing ? `${(i % 12) * 80}ms` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
