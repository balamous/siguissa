import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Coins, Music2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Waveform } from "@/components/Waveform";

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

  const cost = profile?.is_premium ? 3 : 5;
  const hasCredits = (profile?.credits ?? 0) >= cost;
  const promptOk = prompt.trim().length >= 3;

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
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-music", {
        body: { prompt, title, genre, mood, tempo, language },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      await refreshProfile();
      toast.success("Track ready!", { description: `${cost} credits used.` });
      navigate("/library");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
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
          <div className="p-6 rounded-2xl glass relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-brand-soft -z-10" aria-hidden />
            <div className="text-xs text-primary-glow font-semibold uppercase tracking-wider">Preview</div>
            <h3 className="font-display font-bold text-2xl mt-2 leading-tight">
              {genre} · {mood}
            </h3>
            <div className="text-sm text-muted-foreground mt-1">{tempo} · {language}</div>
            <div className="mt-5">
              <Waveform bars={32} seed={`${genre}${mood}${tempo}`} className="h-12" />
            </div>
          </div>

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
              disabled={!canGenerate || generating}
            >
              {generating ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Generating...</>
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
