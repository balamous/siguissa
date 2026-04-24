import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Coins, Music2, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";

const COVERS: Record<string, string> = { "cover-1": cover1, "cover-2": cover2, "cover-3": cover3 };

type Track = {
  id: string;
  title: string;
  genre: string | null;
  cover_url: string | null;
  created_at: string;
  is_unlocked: boolean;
};

const Dashboard = () => {
  const { profile, user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState({ total: 0, unlocked: 0, spent: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase
        .from("tracks")
        .select("id, title, genre, cover_url, created_at, is_unlocked")
        .order("created_at", { ascending: false })
        .limit(4);
      setTracks((t as Track[]) ?? []);

      const { count: total } = await supabase.from("tracks").select("id", { count: "exact", head: true });
      const { count: unlocked } = await supabase.from("tracks").select("id", { count: "exact", head: true }).eq("is_unlocked", true);
      const { data: tx } = await supabase
        .from("credit_transactions")
        .select("amount")
        .lt("amount", 0);
      const spent = (tx ?? []).reduce((s, r) => s + Math.abs(r.amount), 0);
      setStats({ total: total ?? 0, unlocked: unlocked ?? 0, spent });
    })();
  }, [user]);

  return (
    <div className="container py-8 md:py-12 max-w-6xl">
      {/* Greeting */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 animate-fade-in">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold mt-1">
            {profile?.display_name || "Creator"}
          </h1>
        </div>
        <Button asChild variant="hero" size="lg">
          <Link to="/create"><Sparkles className="h-4 w-4" /> Create new track</Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-10">
        <StatCard icon={Coins} label="Credits" value={profile?.credits ?? 0} accent />
        <StatCard icon={Music2} label="Tracks" value={stats.total} />
        <StatCard icon={Sparkles} label="Unlocked" value={stats.unlocked} />
        <StatCard icon={TrendingUp} label="Credits spent" value={stats.spent} />
      </div>

      {/* Buy credits CTA */}
      {(profile?.credits ?? 0) < 10 && (
        <div className="mb-10 p-6 rounded-2xl glass border-primary/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-xl">Running low on credits</h3>
            <p className="text-sm text-muted-foreground mt-1">Top up from $5 or go premium for half-off generations.</p>
          </div>
          <Button asChild variant="hero">
            <Link to="/pricing">Get credits <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      )}

      {/* Recent tracks */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl font-bold">Recent creations</h2>
        <Link to="/library" className="text-sm text-muted-foreground hover:text-foreground">View library →</Link>
      </div>

      {tracks.length === 0 ? (
        <div className="p-12 rounded-2xl glass text-center">
          <Music2 className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-bold text-xl">Your library is empty</h3>
          <p className="text-muted-foreground mt-2 mb-6">Create your first AI-generated track in seconds.</p>
          <Button asChild variant="hero"><Link to="/create">Start creating</Link></Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tracks.map((t) => (
            <Link key={t.id} to="/library" className="group rounded-2xl overflow-hidden glass hover:border-primary/40 transition-all">
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={COVERS[t.cover_url ?? "cover-1"] ?? cover1}
                  alt={t.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 inset-x-3">
                  <Waveform bars={28} seed={t.id} className="h-8 opacity-80" />
                </div>
              </div>
              <div className="p-4">
                <div className="text-[10px] text-primary-glow font-semibold uppercase tracking-wider">{t.genre ?? "Custom"}</div>
                <div className="font-display font-bold truncate mt-1">{t.title}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: boolean }) => (
  <div className={`p-5 rounded-2xl glass ${accent ? "bg-gradient-brand-soft border-primary/30" : ""}`}>
    <Icon className={`h-5 w-5 ${accent ? "text-primary-glow" : "text-muted-foreground"}`} />
    <div className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

export default Dashboard;
