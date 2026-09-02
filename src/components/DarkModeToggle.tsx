"use client";

import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadDarkMode();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle("dark", dark);
    // Persist locally immediately
    localStorage.setItem("prime-dark", dark ? "1" : "0");
    // Save to server (fire and forget)
    try {
      import("../functions/user/dashboard-extras").then((mod) =>
        mod.toggleDarkMode()
      );
    } catch {}
  }, [dark, loaded]);

  const loadDarkMode = async () => {
    // Check localStorage first
    const local = localStorage.getItem("prime-dark");
    if (local === "1") {
      setDark(true);
      document.documentElement.classList.add("dark");
      setLoaded(true);
      return;
    }
    try {
      const { getDarkMode } = await import("../functions/user/dashboard-extras");
      const data = await getDarkMode();
      setDark(data.darkMode);
      document.documentElement.classList.toggle("dark", data.darkMode);
    } catch {
    } finally {
      setLoaded(true);
    }
  };

  return (
    <button
      onClick={() => setDark(!dark)}
      className="flex items-center gap-2 rounded border border-gold/20 bg-cream px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all hover:bg-gold/10 dark:border-gold/30 dark:bg-emerald/10"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="text-base">{dark ? "☀️" : "🌙"}</span>
      <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
