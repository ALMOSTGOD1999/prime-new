import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";
import { getMe } from "@/functions/auth/me";
import { logout } from "@/functions/auth/logout";

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
    <nav className="fixed top-0 z-40 flex w-full items-center justify-between border-b border-gold/20 bg-cream/90 px-6 py-4 backdrop-blur-md">
      <Link to="/" className="text-emerald">
        <Wordmark className="text-xl font-bold uppercase" />
      </Link>

      <div className="hidden space-x-8 text-xs font-semibold uppercase tracking-widest md:flex">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: link.to === "/" }}
            activeProps={{ className: "text-gold" }}
            className="transition-colors hover:text-gold"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center space-x-3">
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-emerald/10" />
        ) : user ? (
          <>
            <Link
              to={user.isAdmin ? "/admin" : "/dashboard"}
              className="border border-emerald px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-emerald hover:text-cream sm:text-xs"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald sm:text-xs"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/auth"
              className="border border-emerald px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-emerald hover:text-cream sm:text-xs"
            >
              Login
            </Link>
            <Link
              to="/auth"
              className="bg-gold px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald sm:text-xs"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
