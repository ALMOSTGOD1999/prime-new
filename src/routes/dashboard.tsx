import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Wordmark } from "../components/Wordmark";
import { getMe } from "../functions/auth/me";
import { logout } from "../functions/auth/logout";
import { stopImpersonation } from "../functions/admin/impersonate";
import { getNotifications } from "../functions/user/notifications";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then((d) => {
        setUser(d.user);
        const match = document.cookie.match(/auth_token=([^;]+)/);
        if (match && match[1]) {
          try {
            const parts = match[1].split(".");
            if (parts[1]) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.impersonatorId) setIsImpersonating(true);
            }
          } catch {}
        }
      })
      .catch(() => navigate({ to: "/auth" }))
      .finally(() => setLoading(false));

    // Poll notifications every 30 seconds
    const interval = setInterval(() => {
      getNotifications()
        .then((d) => {
          const newCount = d.unreadCount;
          if (newCount > prevUnreadRef.current && prevUnreadRef.current > 0) {
            playNotificationSound();
          }
          prevUnreadRef.current = newCount;
          setUnreadCount(newCount);
        })
        .catch(() => {});
    }, 30000);

    // Initial load
    getNotifications()
      .then((d) => {
        setUnreadCount(d.unreadCount);
        prevUnreadRef.current = d.unreadCount;
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const playNotificationSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.08;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  const handleReturnToAdmin = async () => {
    try {
      const result = await stopImpersonation();
      document.cookie = `auth_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      navigate({ to: "/admin" });
    } catch (err: any) {
      alert(err.message || "Failed to return to admin");
    }
  };

  const handleLogout = async () => {
    await logout();
    document.cookie = "auth_token=; path=/; max-age=0";
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-sm uppercase tracking-widest text-emerald/70">Loading...</div>
      </div>
    );
  }

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: "◈" },
    { to: "/dashboard/team", label: "My Team", icon: "◇" },
    { to: "/dashboard/tree", label: "Tree View", icon: "🌳" },
    { to: "/dashboard/income", label: "Income", icon: "◆" },
    { to: "/dashboard/reports", label: "Reports", icon: "📊" },
    { to: "/dashboard/leaderboard", label: "Leaderboard", icon: "🏆" },
    { to: "/dashboard/profile", label: "Profile", icon: "👤" },
    { to: "/dashboard/kyc", label: "KYC", icon: "📋" },
    { to: "/dashboard/notifications", label: "Notifications", icon: "🔔", badge: unreadCount },
  ];

  return (
    <div className="flex min-h-screen bg-cream">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gold/20 bg-emerald text-cream transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-cream/10 p-6">
            <Link to="/" className="text-cream">
              <Wordmark className="text-lg font-bold uppercase" />
            </Link>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-cream/50">Dashboard</p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/dashboard" }}
                activeProps={{ className: "bg-cream/10 text-gold" }}
                className="flex items-center justify-between rounded px-4 py-3 text-xs font-semibold uppercase tracking-widest text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream"
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </div>
                {"badge" in link && link.badge > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-cream">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="border-t border-cream/10 p-4">
            <div className="mb-4 px-4">
              <p className="text-[10px] uppercase tracking-widest text-cream/40">Logged in as</p>
              <p className="truncate text-xs font-semibold text-cream">{user?.name}</p>
              <p className="truncate text-[10px] text-cream/50">{user?.referralCode}</p>
            </div>
            {isImpersonating && (
              <button
                onClick={handleReturnToAdmin}
                className="mb-2 w-full rounded border border-gold/40 bg-gold/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-gold transition-colors hover:bg-gold/20"
              >
                Return to Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full rounded border border-cream/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream/60 transition-colors hover:border-gold hover:text-gold"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gold/20 bg-cream/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="mr-4 text-emerald">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Wordmark className="text-sm font-bold uppercase" />
          </div>
          <Link to="/dashboard/notifications" className="relative text-emerald">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-cream">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </header>

        {isImpersonating && (
          <div className="flex items-center justify-between bg-gold/10 px-4 py-2 text-xs">
            <span className="font-semibold text-gold">
              Viewing as <strong>{user?.name}</strong> ({user?.referralCode})
            </span>
            <button
              onClick={handleReturnToAdmin}
              className="rounded bg-emerald px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
            >
              Return to Admin
            </button>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
