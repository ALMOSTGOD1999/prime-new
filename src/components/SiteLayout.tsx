import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-sans text-emerald">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
