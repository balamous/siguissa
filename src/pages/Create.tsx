import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Coins, Music2, Play, Pause, Lock, Download, Library as LibraryIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Waveform } from "@/components/Waveform";
import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";

const COVERS: Record<string, string> = { "cover-1": cover1, "cover-2": cover2, "cover-3": cover3 };

type GeneratedTrack = {
  id: string;
  title: string;
  genre: string | null;
  mood: string | null;
  prompt: string;
  audio_url: string | null;
  cover_url: string | null;
  duration_seconds: number;
  is_unlocked: boolean;
};

const GENRES = ["Afrobeat", "Drill", "Gospel", "Rap", "RnB", "Amapiano", "Reggae", "Pop", "Lo-fi", "House"];
const MOODS = ["Happy", "Sad", "Spiritual", "Party", "Romantic", "Dark", "Hopeful", "Energetic"];
const TEMPOS = ["Slow", "Medium", "Fast"];
const LANGS = ["English", "French", "Wolof", "Yoruba", "Pidgin", "Lingala", "Swahili", "Instrumental"];

const SUGGESTIONS = [
  "Sunset Afrobeat with smooth male vocals about love in Lagos",
  "Hard UK drill instrumental, dark melodic strings, 140 BPM",
  "Gospel praise song with choir and uplifting piano",
  "Amapiano party track with log drums and female vocals",
];

const Create = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Afrobeat");
  const [mood, setMood] = useState("Happy");
  const [tempo, setTempo] = useState("Medium");
  const [language, setLanguage] = useState("English");
  const [generating, setGenerating] = useState(false);
  const [track, setTrack] = useState<GeneratedTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cost = profile?.is_premium ? 3 : 5;
  const unlockCost = profile?.is_premium ? 0 : 3;
  const hasCredits = (profile?.credits ?? 0) >= cost;
  const promptOk = prompt.trim().length >= 3;

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  // Tear down audio when track changes or component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!promptOk) {
      toast.error("Describe your track first", { description: "Write at least 3 characters." });
      return;
    }
    if (!hasCredits) {
      toast.error("Not enough credits", { description: "Top up to keep creating." });
      navigate("/pricing");
      return;
    }
    // Reset previous preview
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setTrack(null);

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-music", {
        body: { prompt, title, genre, mood, tempo, language },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const newTrack = (data as { track: GeneratedTrack }).track;
      await refreshProfile();
      setTrack(newTrack);
      toast.success("Track ready!", { description: `${cost} credits used. Hit play to preview.` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const togglePlay = async () => {
    if (!track?.audio_url) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
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
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    });
    audio.addEventListener("error", () => {
      if (audioRef.current === audio) {
        toast.error("Couldn't play track", { description: "Audio source unavailable." });
        setPlaying(false);
      }
    });

    try {
      await audio.play();
      if (audioRef.current === audio) {
        setPlaying(true);
        setDuration(isFinite(audio.duration) ? audio.duration : 0);
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Playback blocked";
      toast.error("Playback failed", { description: msg });
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlaying(false);
      }
    }
  };

  const seek = (ratio: number) => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (!isFinite(d) || d <= 0) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    audioRef.current.currentTime = clamped * d;
    setProgress(clamped);
    setCurrentTime(clamped * d);
  };

  const handleUnlock = async () => {
    if (!track) return;
    setUnlocking(true);
    try {
      const { data, error } = await supabase.functions.invoke("unlock-track", { body: { trackId: track.id } });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const updated = (data as { track: GeneratedTrack }).track;
      await refreshProfile();
      setTrack(updated);
      toast.success("Track unlocked", { description: "HQ master ready to download." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to unlock";
      toast.error(msg);
    } finally {
      setUnlocking(false);
    }
  };

  const handleDownload = async () => {
    if (!track?.is_unlocked || !track.audio_url) return;
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

  const startNew = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setTrack(null);
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  };

  return (
    <div className="container py-8 md:py-12 max-w-5xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-5xl font-bold">Create</h1>
          <p className="text-muted-foreground mt-2">Describe your vibe. The AI takes care of the rest.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
          <Coins className="h-4 w-4 text-primary-glow" />
          <span className="font-semibold">{profile?.credits ?? 0}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Form */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass">
            <Label htmlFor="prompt" className="text-base font-semibold">Describe your track</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Sunset Afrobeat with smooth male vocals about love in Lagos..."
              rows={5}
              maxLength={500}
              className="mt-3 bg-input/60 border-border resize-none text-base"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-muted-foreground">{prompt.length} / 500</div>
              <button
                type="button"
                onClick={() => setPrompt(SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)])}
                className="text-xs text-primary-glow hover:underline"
              >
                ✨ Inspire me
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass space-y-5">
            <div>
              <Label className="text-sm font-semibold mb-3 block">Genre</Label>
              <ChipGroup options={GENRES} value={genre} onChange={setGenre} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-3 block">Mood</Label>
              <ChipGroup options={MOODS} value={mood} onChange={setMood} />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label className="text-sm font-semibold mb-3 block">Tempo</Label>
                <ChipGroup options={TEMPOS} value={tempo} onChange={setTempo} />
              </div>
              <div>
                <Label className="text-sm font-semibold mb-3 block">Language</Label>
                <ChipGroup options={LANGS} value={language} onChange={setLanguage} />
              </div>
            </div>
            <div>
              <Label htmlFor="title" className="text-sm font-semibold">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-generated if empty"
                maxLength={120}
                className="mt-2 bg-input/60 border-border"
              />
            </div>
          </div>
        </div>

        {/* Sticky sidebar */}
        <aside className="lg:sticky lg:top-6 h-fit space-y-4">
          {track ? (
            <div className="p-6 rounded-2xl glass relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="absolute inset-0 bg-gradient-brand-soft -z-10" aria-hidden />
              <div className="flex items-center gap-2 text-xs text-primary-glow font-semibold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-glow animate-pulse" />
                Now playing
              </div>
              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="relative h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 group/cover"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  <img
                    src={COVERS[track.cover_url ?? "cover-1"] ?? cover1}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 grid place-items-center opacity-100 group-hover/cover:bg-black/55 transition-colors">
                    {playing ? (
                      <Pause className="h-7 w-7 text-white" fill="currentColor" />
                    ) : (
                      <Play className="h-7 w-7 text-white ml-0.5" fill="currentColor" />
                    )}
                  </div>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold truncate">{track.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {track.genre} · {track.mood}
                  </div>
                  {track.is_unlocked && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary-glow font-semibold">
                      HQ
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] tabular-nums text-muted-foreground w-9 text-right">
                  {fmt(currentTime)}
                </span>
                <Waveform
                  bars={40}
                  seed={track.id}
                  playing={playing}
                  progress={progress}
                  onSeek={seek}
                  className="h-10 flex-1"
                />
                <span className="text-[10px] tabular-nums text-muted-foreground w-9">
                  {fmt(duration || track.duration_seconds)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {track.is_unlocked ? (
                  <Button onClick={handleDownload} variant="hero" className="col-span-2">
                    <Download className="h-4 w-4" /> Download HQ
                  </Button>
                ) : (
                  <Button onClick={handleUnlock} variant="hero" className="col-span-2" disabled={unlocking}>
                    {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Unlock & download {unlockCost > 0 ? `· ${unlockCost}` : ""}
                  </Button>
                )}
                <Button onClick={startNew} variant="glass" size="sm">
                  <Sparkles className="h-4 w-4" /> New
                </Button>
                <Button asChild variant="glass" size="sm">
                  <Link to="/library"><LibraryIcon className="h-4 w-4" /> Library</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl glass relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-brand-soft -z-10" aria-hidden />
              <div className="text-xs text-primary-glow font-semibold uppercase tracking-wider">Preview</div>
              <h3 className="font-display font-bold text-2xl mt-2 leading-tight">
                {genre} · {mood}
              </h3>
              <div className="text-sm text-muted-foreground mt-1">{tempo} · {language}</div>
              <div className="mt-5">
                <Waveform bars={32} seed={`${genre}${mood}${tempo}`} playing={generating} className="h-12" />
              </div>
              {generating && (
                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Composing your track…
                </div>
              )}
            </div>
          )}

          <div className="p-6 rounded-2xl glass">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost per generation</span>
              <span className="font-semibold flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-primary-glow" /> {cost}
              </span>
            </div>
            {profile?.is_premium && (
              <div className="text-xs text-primary-glow mt-1">Premium discount applied</div>
            )}

            <Button
              onClick={handleGenerate}
              variant="hero"
              size="xl"
              className="w-full mt-5"
              disabled={generating}
            >
              {generating ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Generating...</>
              ) : track ? (
                <><Sparkles className="h-5 w-5" /> Generate another</>
              ) : (
                <><Sparkles className="h-5 w-5" /> Generate track</>
              )}
            </Button>
            {(profile?.credits ?? 0) < cost && (
              <p className="text-xs text-destructive mt-3 text-center">
                Not enough credits.{" "}
                <button onClick={() => navigate("/pricing")} className="underline">Top up</button>
              </p>
            )}
          </div>

          <div className="p-5 rounded-2xl glass text-xs text-muted-foreground flex gap-3">
            <Music2 className="h-4 w-4 text-primary-glow flex-shrink-0 mt-0.5" />
            <span>Beta engine returns 2-min previews. HQ master unlocks for {profile?.is_premium ? 0 : 3} credits.</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

const ChipGroup = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={cn(
          "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all",
          value === opt
            ? "bg-gradient-brand text-white border-transparent shadow-glow"
            : "bg-card/40 border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
        )}
      >
        {opt}
      </button>
    ))}
  </div>
);

export default Create;
