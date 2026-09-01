import { Link } from "@tanstack/react-router";
import { Typewriter } from "./Typewriter";
import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-gold/10 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between md:flex-row">
        <Wordmark className="mb-6 text-lg font-bold uppercase md:mb-0" />
        <div className="flex space-x-8 text-[10px] font-bold uppercase tracking-widest">
          <Link to="/gold" className="hover:text-gold">
            Gold
          </Link>
          <Link to="/silver" className="hover:text-gold">
            Silver
          </Link>
          <Link to="/about" className="hover:text-gold">
            About Us
          </Link>
          <Link to="/contact" className="hover:text-gold">
            Contact Us
          </Link>
        </div>
        <div className="mt-6 text-[10px] uppercase tracking-widest text-emerald/60 md:mt-0">
          © 2026 Prime Jewellery Ltd. All rights reserved.
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-gold/10 pt-6 text-center">
        <Typewriter
          className="inline-block text-xs tracking-widest text-emerald/60"
          speed={90}
          delay={800}
          segments={[
            { text: "crafted by " },
            {
              text: "INCODENT",
              className: "font-bold text-gold transition-colors hover:text-emerald",
              href: "https://www.incodent.com/",
            },
          ]}
        />
      </div>
    </footer>
  );
}

