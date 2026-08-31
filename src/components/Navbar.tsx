import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";
import { getMe } from "../functions/auth/me";
import { logout } from "../functions/auth/logout";

const links = [
  { to: "/", label: "Home" },
  { to: "/gold", label: "Gold" },
  { to: "/silver", label: "Silver" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    getMe()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    document.cookie = "auth_token=; path=/; max-age=0";
    setUser(null);
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gold/15 bg-cream/95 backdrop-blur-md shadow-sm shadow-gold/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-emerald transition-opacity hover:opacity-80">
          <Wordmark className="text-xl font-bold uppercase" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden space-x-8 text-xs font-semibold uppercase tracking-[0.2em] md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              activeProps={{ className: "text-gold" }}
              className="transition-colors duration-200 hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-emerald/10" />
          ) : user ? (
            <>
              <Link
                to={user.isAdmin ? "/admin" : "/dashboard"}
                className="hidden rounded-lg border border-emerald bg-transparent px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald transition-all duration-200 hover:bg-emerald hover:text-cream sm:inline-flex"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream transition-all duration-200 hover:bg-emerald"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden rounded-lg border border-emerald bg-transparent px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald transition-all duration-200 hover:bg-emerald hover:text-cream sm:inline-flex"
              >
                Login
              </Link>
              <Link
                to="/auth"
                className="rounded-lg bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-cream transition-all duration-200 hover:bg-emerald"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-1.5 text-emerald transition-colors hover:bg-emerald/5 md:hidden"
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gold/10 bg-cream/98 px-6 py-4 shadow-lg backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.to === "/" }}
                activeProps={{ className: "text-gold bg-gold/5" }}
                className="rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald/70 transition-colors hover:bg-gold/5 hover:text-gold"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                to={user.isAdmin ? "/admin" : "/dashboard"}
                className="rounded-lg bg-emerald/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald transition-colors hover:bg-emerald/10"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
