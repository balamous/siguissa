import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Sparkles, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

type Tx = { id: string; amount: number; reason: string; created_at: string };

const Profile = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [language, setLanguage] = useState(profile?.language ?? "en");
  const [saving, setSaving] = useState(false);
  const [tx, setTx] = useState<Tx[]>([]);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setLanguage(profile?.language ?? "en");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("credit_transactions")
      .select("id, amount, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setTx((data as Tx[]) ?? []));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, language })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      refreshProfile();
    }
  };

  return (
    <div className="container py-8 md:py-12 max-w-3xl">
      <h1 className="font-display text-3xl md:text-5xl font-bold mb-8">Profile</h1>

      <div className="p-6 rounded-2xl glass mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Plan</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display font-bold text-xl">{profile?.is_premium ? "Premium" : "Free"}</span>
              {profile?.is_premium && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-brand text-white font-semibold">PREMIUM</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Balance</div>
            <div className="flex items-center gap-1.5 mt-1 justify-end">
              <Coins className="h-4 w-4 text-primary-glow" />
              <span className="font-display font-bold text-xl">{profile?.credits ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl glass mb-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} disabled className="mt-2 bg-input/40" />
        </div>
        <div>
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="mt-2 bg-input/60"
          />
        </div>
        <div>
          <Label>Language</Label>
          <div className="flex gap-2 mt-2">
            {[
              { code: "en", label: "English" },
              { code: "fr", label: "Français" },
            ].map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  language === l.code
                    ? "bg-gradient-brand text-white border-transparent"
                    : "bg-card/40 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={save} variant="hero" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

      <div className="p-6 rounded-2xl glass mb-6">
        <h2 className="font-display font-bold text-xl mb-4">Recent activity</h2>
        {tx.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {tx.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg grid place-items-center ${t.amount > 0 ? "bg-primary/15 text-primary-glow" : "bg-muted text-muted-foreground"}`}>
                    {t.amount > 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium capitalize">{t.reason.replace("_", " ")}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className={`font-semibold tabular-nums ${t.amount > 0 ? "text-primary-glow" : "text-muted-foreground"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button variant="outline" onClick={signOut} className="w-full">Sign out</Button>
    </div>
  );
};

export default Profile;
