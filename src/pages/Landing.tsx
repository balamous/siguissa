import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Music2, Coins, Globe2, Zap, Shield, ArrowRight, Play } from "lucide-react";
import heroWaves from "@/assets/hero-waves.jpg";
import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const { user } = useAuth();
  const cta = user ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* SEO */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl">Iziwave</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">Sign in</Link>
            <Button asChild variant="hero" size="sm">
              <Link to={cta}>Start free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-40">
        <div
          className="absolute inset-0 bg-gradient-hero opacity-90 -z-10"
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage: `url(${heroWaves})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
          aria-hidden
        />

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-glow animate-pulse" />
              AI music studio · Now in beta
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight">
              Turn any idea
              <br />
              into a <span className="text-gradient">full track</span>.
            </h1>

            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Generate Afrobeat, Drill, Gospel, Rap and more with a single prompt.
              Pay only for what you create. Built for the next generation of African artists.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button asChild variant="hero" size="xl">
                <Link to={cta}>
                  <Sparkles className="h-5 w-5" />
                  Start creating — 25 free credits
                </Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              No credit card. EN · FR · 🇸🇳 🇨🇮 🇳🇬 🇨🇲 supported.
            </p>
          </div>

          {/* Floating cover preview */}
          <div className="mt-20 md:mt-28 max-w-5xl mx-auto">
            <div className="glass rounded-3xl p-4 md:p-6 shadow-elegant">
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { cover: cover1, title: "Lagos Nights", genre: "Afrobeat" },
                  { cover: cover2, title: "Cyber Saint", genre: "Drill" },
                  { cover: cover3, title: "Sahara Soul", genre: "Spiritual" },
                ].map((t, i) => (
                  <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden bg-card animate-float" style={{ animationDelay: `${i * 0.4}s` }}>
                    <img src={t.cover} alt={t.title} loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
                      <div>
                        <div className="text-xs text-primary-glow font-semibold uppercase tracking-wider">{t.genre}</div>
                        <div className="font-display font-bold text-lg">{t.title}</div>
                      </div>
                      <button className="h-10 w-10 rounded-full bg-white text-black grid place-items-center shadow-lg hover:scale-110 transition-transform">
                        <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32 relative">
        <div className="container">
          <div className="max-w-2xl mb-16">
            <div className="text-sm font-semibold text-primary-glow uppercase tracking-wider mb-4">Built for creators</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              Everything you need to ship a song.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Music2, title: "Prompt to track", desc: "Describe a vibe. Pick a genre, mood, language. Get a full song in seconds." },
              { icon: Coins, title: "Credit-based", desc: "Pay per generation. No surprise bills. Buy packs from $5 or go premium for half-off creation." },
              { icon: Globe2, title: "Africa-ready", desc: "Bilingual UI (EN/FR), Mobile Money support coming soon, low-bandwidth audio." },
              { icon: Zap, title: "Lightning fast", desc: "Generations stream back in under 2 seconds in our beta engine." },
              { icon: Shield, title: "You own it", desc: "Every track you generate is yours. Download, share, monetize." },
              { icon: Sparkles, title: "Studio quality", desc: "From bedroom beats to release-ready masters with HQ unlock." },
            ].map((f) => (
              <div key={f.title} className="group relative p-6 rounded-2xl glass hover:border-primary/40 transition-all">
                <div className="h-11 w-11 rounded-xl bg-gradient-brand-soft border border-primary/30 grid place-items-center mb-5 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-primary-glow" />
                </div>
                <h3 className="font-display font-bold text-xl mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 md:py-32 relative">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold">
              Three steps. <span className="text-gradient">One song.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Describe", desc: "“Afrobeat with male vocals, sunset vibes, 110 BPM.”" },
              { step: "02", title: "Generate", desc: "Our AI engine arranges, mixes and masters in seconds." },
              { step: "03", title: "Download", desc: "Unlock the HQ master with credits and release it anywhere." },
            ].map((s) => (
              <div key={s.step} className="relative p-8 rounded-3xl glass">
                <div className="text-7xl font-display font-bold text-gradient leading-none mb-4">{s.step}</div>
                <h3 className="font-display font-bold text-2xl mb-2">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl p-12 md:p-20 text-center glass">
            <div className="absolute inset-0 bg-gradient-hero opacity-60 -z-10" aria-hidden />
            <h2 className="font-display text-4xl md:text-6xl font-bold leading-tight max-w-3xl mx-auto">
              Your first 25 credits are <span className="text-gradient">on us</span>.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Sign up, prompt a song, hear it in seconds. No card required.
            </p>
            <Button asChild variant="hero" size="xl" className="mt-10">
              <Link to={cta}>
                Start creating <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-glow" />
            <span>© {new Date().getFullYear()} Iziwave. AI music for everyone.</span>
          </div>
          <div className="flex gap-6">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
