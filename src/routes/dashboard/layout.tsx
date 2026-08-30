import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wordmark } from "../../components/Wordmark";
import { getMe } from "../../functions/auth/me";
import { logout } from "../../functions/auth/logout";

export const Route = createFileRoute("/dashboard/layout")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then((d) => setUser(d.user))
      .catch(() => navigate({ to: "/auth" }))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    document.cookie = "auth_token=; path=/; max-age=0";
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-sm uppercase tracking-widest text-emerald/50">Loading...</div>
      </div>
    );
  }

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: "◈" },
    { to: "/dashboard/team", label: "My Team", icon: "◇" },
    { to: "/dashboard/income", label: "Income", icon: "◆" },
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

          <nav className="flex-1 space-y-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/dashboard" }}
                activeProps={{ className: "bg-cream/10 text-gold" }}
                className="flex items-center space-x-3 rounded px-4 py-3 text-xs font-semibold uppercase tracking-widest text-cream/70 transition-colors hover:bg-cream/5 hover:text-cream"
                onClick={() => setSidebarOpen(false)}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-cream/10 p-4">
            <div className="mb-4 px-4">
              <p className="text-[10px] uppercase tracking-widest text-cream/40">Logged in as</p>
              <p className="truncate text-xs font-semibold text-cream">{user?.name}</p>
              <p className="truncate text-[10px] text-cream/50">{user?.referralCode}</p>
            </div>
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
        <header className="flex items-center border-b border-gold/20 bg-cream/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="mr-4 text-emerald">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Wordmark className="text-sm font-bold uppercase" />
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
