import { forwardRef, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  bars?: number;
  playing?: boolean;
  progress?: number; // 0-1
  className?: string;
  seed?: string;
  onSeek?: (ratio: number) => void;
}

export const Waveform = forwardRef<HTMLDivElement, WaveformProps>(({
  bars = 64,
  playing = false,
  progress = 0,
  className,
  seed = "x",
  onSeek,
}, _forwardedRef) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const heights = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return Array.from({ length: bars }, (_, i) => {
      h = (h * 9301 + 49297) % 233280;
      const r = h / 233280;
      const wave = 0.4 + 0.6 * Math.abs(Math.sin((i / bars) * Math.PI * 3 + r * 2));
      return wave * (0.6 + r * 0.4);
    });
  }, [bars, seed]);

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el || !onSeek) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromEvent(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromEvent(e.clientX);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    draggingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const interactive = !!onSeek;

  return (
    <div
      ref={trackRef}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive ? handlePointerUp : undefined}
      onPointerCancel={interactive ? handlePointerUp : undefined}
      role={interactive ? "slider" : undefined}
      aria-label={interactive ? "Seek" : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
      aria-valuenow={interactive ? Math.round(progress * 100) : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        "flex items-center justify-between gap-[2px] h-16 w-full select-none",
        interactive && "cursor-pointer touch-none",
        className,
      )}
    >
      {heights.map((h, i) => {
        const filled = i / bars <= progress;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors pointer-events-none",
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
});
Waveform.displayName = "Waveform";
