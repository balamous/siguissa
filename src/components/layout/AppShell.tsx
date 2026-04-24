import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, Music2, Library, CreditCard, User, LogOut, Shield, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/create", label: "Create", icon: Music2 },
  { to: "/library", label: "Library", icon: Library },
  { to: "/pricing", label: "Pricing", icon: CreditCard },
  { to: "/profile", label: "Profile", icon: User },
];

export const AppShell = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/60 glass sticky top-0 h-screen">
        <Link to="/dashboard" className="flex items-center gap-2 px-6 h-16 border-b border-border/60">
          <div className="h-8 w-8 rounded-lg bg-gradient-brand grid place-items-center shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg">Iziwave</span>
        </Link>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-brand-soft text-foreground border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-brand-soft text-foreground border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )
              }
            >
              <Shield className="h-4 w-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="p-3 border-t border-border/60 space-y-2">
          <Link to="/pricing" className="flex items-center justify-between p-3 rounded-xl bg-gradient-brand-soft border border-primary/30 hover:border-primary/60 transition-all">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary-glow" />
              <span className="text-sm font-semibold">{profile?.credits ?? 0} credits</span>
            </div>
            <span className="text-xs text-primary-glow font-semibold">+ Buy</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border/60 glass sticky top-0 z-30">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-brand grid place-items-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display font-bold">Iziwave</span>
          </Link>
          <Link to="/pricing" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-brand-soft border border-primary/30 text-sm">
            <Coins className="h-3.5 w-3.5 text-primary-glow" />
            <span className="font-semibold">{profile?.credits ?? 0}</span>
          </Link>
        </div>

        <Outlet />

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border/60 grid grid-cols-5">
          {nav.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium",
                  isActive ? "text-primary-glow" : "text-muted-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="md:hidden h-16" />
      </main>
    </div>
  );
};
