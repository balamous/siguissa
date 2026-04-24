import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Check, Coins, Sparkles, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PACKS = [
  { id: "starter", price: 5, credits: 60, label: "Starter", desc: "~12 generations" },
  { id: "creator", price: 10, credits: 150, label: "Creator", desc: "~30 generations", popular: true },
  { id: "pro", price: 20, credits: 360, label: "Pro", desc: "~72 generations", bonus: "+20% bonus" },
];

const Pricing = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleBuy = async (type: "pack" | "subscription", packId?: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(packId ?? "subscription");
    try {
      const { data, error } = await supabase.functions.invoke("mock-checkout", {
        body: { type: type === "subscription" ? "subscription" : "pack", packId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      await refreshProfile();
      toast.success(type === "subscription" ? "Premium activated!" : "Credits added!", {
        description: type === "subscription" ? "Half-off generations + 500 credits/mo." : "Enjoy creating.",
      });
      navigate("/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout failed";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container py-12 md:py-20 max-w-6xl">
      <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium mb-5">
          <Sparkles className="h-3 w-3 text-primary-glow" />
          Pay only for what you create
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
          Simple <span className="text-gradient">credit-based</span> pricing.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Top up once or subscribe for half-off generations and a monthly stash.
        </p>
      </div>

      {/* Credit packs */}
      <div className="grid md:grid-cols-3 gap-5 mb-12">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className={cn(
              "relative p-8 rounded-3xl glass flex flex-col",
              pack.popular && "border-primary/60 shadow-glow",
            )}
          >
            {pack.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-brand text-white text-xs font-semibold">
                Most popular
              </div>
            )}
            <div className="text-sm font-semibold text-primary-glow uppercase tracking-wider">{pack.label}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold">${pack.price}</span>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary-glow" />
              <span className="font-display text-2xl font-bold">{pack.credits}</span>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{pack.desc}</p>
            {pack.bonus && <p className="text-xs text-primary-glow font-semibold mt-1">{pack.bonus}</p>}

            <Button
              onClick={() => handleBuy("pack", pack.id)}
              variant={pack.popular ? "hero" : "outline"}
              size="lg"
              className="mt-8 w-full"
              disabled={loading === pack.id}
            >
              {loading === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy now"}
            </Button>
          </div>
        ))}
      </div>

      {/* Premium subscription */}
      <div className="relative overflow-hidden rounded-3xl glass p-8 md:p-12 mb-12">
        <div className="absolute inset-0 bg-gradient-brand-soft -z-10" aria-hidden />
        <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <div className="text-sm font-semibold text-primary-glow uppercase tracking-wider">Premium · Monthly</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-2">
              Go all-in for <span className="text-gradient">$15/mo</span>
            </h2>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                "500 credits every month",
                "50% off all generations",
                "Free HQ unlocks on every track",
                "Priority generation queue",
              ].map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-gradient-brand grid place-items-center flex-shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <Button
            onClick={() => handleBuy("subscription")}
            variant="hero"
            size="xl"
            disabled={loading === "subscription" || profile?.is_premium}
          >
            {profile?.is_premium ? "Active" : loading === "subscription" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Go Premium"}
          </Button>
        </div>
      </div>

      {/* Mobile money */}
      <div className="p-6 rounded-2xl glass flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-brand-soft border border-primary/30 grid place-items-center flex-shrink-0">
          <Smartphone className="h-5 w-5 text-primary-glow" />
        </div>
        <div>
          <h3 className="font-display font-bold">Mobile Money — coming soon</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Orange Money, MTN MoMo and Wave support is on the roadmap. Today we offer instant credit top-ups via card.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
