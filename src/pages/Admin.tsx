import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Music2, Coins } from "lucide-react";

type Profile = { id: string; display_name: string | null; credits: number; is_premium: boolean; created_at: string };

const Admin = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalTracks: 0, totalCreditsSpent: 0 });

  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, credits, is_premium, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setUsers((profs as Profile[]) ?? []);

      const { count: u } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const { count: tr } = await supabase.from("tracks").select("id", { count: "exact", head: true });
      const { data: tx } = await supabase.from("credit_transactions").select("amount").lt("amount", 0);
      const spent = (tx ?? []).reduce((s, r) => s + Math.abs(r.amount), 0);
      setStats({ totalUsers: u ?? 0, totalTracks: tr ?? 0, totalCreditsSpent: spent });
    })();
  }, []);

  return (
    <div className="container py-8 md:py-12 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">Platform overview</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <Stat icon={Users} label="Users" value={stats.totalUsers} />
        <Stat icon={Music2} label="Tracks" value={stats.totalTracks} />
        <Stat icon={Coins} label="Credits used" value={stats.totalCreditsSpent} />
      </div>

      <div className="p-6 rounded-2xl glass">
        <h2 className="font-display font-bold text-xl mb-4">Recent users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-2">User</th>
                <th className="py-2">Plan</th>
                <th className="py-2 text-right">Credits</th>
                <th className="py-2 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border/40">
                  <td className="py-3">{u.display_name ?? "—"}</td>
                  <td className="py-3">
                    {u.is_premium ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-brand text-white font-semibold">PREMIUM</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Free</span>
                    )}
                  </td>
                  <td className="py-3 text-right tabular-nums font-semibold">{u.credits}</td>
                  <td className="py-3 text-right text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) => (
  <div className="p-5 rounded-2xl glass">
    <Icon className="h-5 w-5 text-primary-glow" />
    <div className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

export default Admin;
