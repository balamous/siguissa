import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Lock, Trash2, Music2, Loader2 } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { toast } from "sonner";
import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";

const COVERS: Record<string, string> = { "cover-1": cover1, "cover-2": cover2, "cover-3": cover3 };

type Track = {
  id: string;
  title: string;
  genre: string | null;
  mood: string | null;
  prompt: string;
  audio_url: string | null;
  cover_url: string | null;
  duration_seconds: number;
  is_unlocked: boolean;
  created_at: string;
};

const Library = () => {
  const { profile, refreshProfile } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const seek = (track: Track, ratio: number) => {
    if (playingId !== track.id || !audioRef.current) return;
    const d = audioRef.current.duration;
    if (!isFinite(d) || d <= 0) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    audioRef.current.currentTime = clamped * d;
    setProgress(clamped);
    setCurrentTime(clamped * d);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("tracks").select("*").order("created_at", { ascending: false });
    setTracks((data as Track[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const togglePlay = async (track: Track) => {
    if (!track.audio_url) {
      toast.error("No audio available for this track");
      return;
    }
    // Toggle off if same track
    if (playingId === track.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    // Stop & fully tear down any previous audio so its play() promise rejects cleanly
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = track.audio_url;
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
    });
    audio.addEventListener("ended", () => {
      setPlayingId((id) => (id === track.id ? null : id));
      setProgress(0);
      setCurrentTime(0);
    });
    audio.addEventListener("error", () => {
      // Only surface if this audio is still the current one
      if (audioRef.current === audio) {
        toast.error("Couldn't play track", { description: "Audio source unavailable." });
        setPlayingId(null);
      }
    });

    try {
      await audio.play();
      // Only commit state if this audio is still the active one
      if (audioRef.current === audio) {
        setPlayingId(track.id);
        setProgress(0);
        setCurrentTime(0);
        setDuration(isFinite(audio.duration) ? audio.duration : 0);
      }
    } catch (err) {
      // Ignore AbortError caused by a newer play() superseding this one
      const name = (err as { name?: string })?.name;
      if (name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Playback blocked";
      toast.error("Playback failed", { description: msg });
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingId(null);
      }
    }
  };

  const handleUnlock = async (track: Track) => {
    setUnlockingId(track.id);
    try {
      const { data, error } = await supabase.functions.invoke("unlock-track", { body: { trackId: track.id } });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      await refreshProfile();
      await load();
      toast.success("Track unlocked", { description: "You can now download the HQ master." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to unlock";
      toast.error(msg);
    } finally {
      setUnlockingId(null);
    }
  };

  const handleDownload = async (track: Track) => {
    if (!track.is_unlocked) return;
    if (!track.audio_url) return;
    try {
      const res = await fetch(track.audio_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this track?")) return;
    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      load();
    }
  };

  const unlockCost = profile?.is_premium ? 0 : 3;

  return (
    <div className="container py-8 md:py-12 max-w-5xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-bold">Library</h1>
          <p className="text-muted-foreground mt-2">{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</p>
        </div>
        <Button asChild variant="hero">
          <Link to="/create">+ New track</Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : tracks.length === 0 ? (
        <div className="p-16 rounded-2xl glass text-center">
          <Music2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-bold text-2xl">Nothing here yet</h3>
          <p className="text-muted-foreground mt-2 mb-6">Generate your first track and it will land here.</p>
          <Button asChild variant="hero"><Link to="/create">Create a track</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map((t) => {
            const isPlaying = playingId === t.id;
            return (
              <div key={t.id} className="group glass rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 transition-all">
                <button onClick={() => togglePlay(t)} className="relative h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden flex-shrink-0 group/cover">
                  <img src={COVERS[t.cover_url ?? "cover-1"] ?? cover1} alt={t.title} loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 grid place-items-center opacity-0 group-hover/cover:opacity-100 transition-opacity">
                    {isPlaying ? <Pause className="h-6 w-6 text-white" fill="currentColor" /> : <Play className="h-6 w-6 text-white ml-0.5" fill="currentColor" />}
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display font-bold truncate">{t.title}</div>
                    {t.is_unlocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary-glow font-semibold">HQ</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.genre} · {t.mood} · {Math.floor(t.duration_seconds / 60)}:{String(t.duration_seconds % 60).padStart(2, "0")}
                  </div>
                  <div className="mt-2 hidden sm:block">
                    {isPlaying ? (
                      <Seekbar
                        progress={progress}
                        currentTime={currentTime}
                        duration={duration || t.duration_seconds}
                        onSeek={(r) => seek(t, r)}
                        fmt={fmt}
                      />
                    ) : (
                      <Waveform bars={48} seed={t.id} playing={false} progress={0} className="h-6" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {t.is_unlocked ? (
                    <Button onClick={() => handleDownload(t)} variant="glass" size="sm">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  ) : (
                    <Button onClick={() => handleUnlock(t)} variant="hero" size="sm" disabled={unlockingId === t.id}>
                      {unlockingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      <span className="hidden sm:inline">{unlockCost === 0 ? "Unlock" : `Unlock · ${unlockCost}`}</span>
                    </Button>
                  )}
                  <Button onClick={() => handleDelete(t.id)} variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Seekbar = ({
  progress,
  currentTime,
  duration,
  onSeek,
  fmt,
}: {
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (ratio: number) => void;
  fmt: (s: number) => string;
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onSeek((clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromEvent(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    seekFromEvent(e.clientX);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const pct = Math.max(0, Math.min(100, progress * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] tabular-nums text-muted-foreground w-9 text-right">
        {fmt(currentTime)}
      </span>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        tabIndex={0}
        className="relative flex-1 h-2 rounded-full bg-muted/60 cursor-pointer group/seek touch-none"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary-glow"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-primary-glow shadow-glow opacity-0 group-hover/seek:opacity-100 transition-opacity"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-9">
        {fmt(duration)}
      </span>
    </div>
  );
};

export default Library;
