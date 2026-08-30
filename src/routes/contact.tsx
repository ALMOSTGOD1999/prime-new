import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Prime Jewellery" },
      {
        name: "description",
        content:
          "Visit a Prime Jewellery boutique in Mumbai or Delhi, or write to our concierge for bespoke gold and silver commissions.",
      },
      { property: "og:title", content: "Contact — Prime Jewellery" },
      {
        property: "og:description",
        content: "Boutiques in Mumbai and Delhi. Bespoke commissions by appointment.",
      },
    ],
  }),
  component: ContactPage,
});

const inputClass =
  "w-full border-b border-gold/40 bg-transparent py-3 text-sm outline-none transition-colors placeholder:text-emerald/40 focus:border-gold";

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-36 pb-24">
        <div className="grid gap-16 md:grid-cols-2">
          <div>
            <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.3em] text-gold">
              Concierge
            </h2>
            <h1 className="text-6xl leading-[0.95] md:text-7xl">
              Write to <span className="italic text-gold">us</span>
            </h1>
            <div className="mt-12 space-y-8 text-sm">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gold">
                  Flagship Boutique
                </p>
                <p className="text-emerald/70">14 Juhu Tara Road, Mumbai 400049</p>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gold">
                  Delhi
                </p>
                <p className="text-emerald/70">C-42 Defence Colony, New Delhi 110024</p>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gold">
                  Reach Us
                </p>
                <p className="text-emerald/70">concierge@primejewellery.com</p>
                <p className="text-emerald/70">+91 22 4567 8900</p>
              </div>
            </div>
          </div>

          <form
            className="space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <input className={inputClass} placeholder="Your name" required />
            <input className={inputClass} type="email" placeholder="Email address" required />
            <input className={inputClass} placeholder="Piece or collection of interest" />
            <textarea className={inputClass} rows={4} placeholder="Your message" required />
            <button
              type="submit"
              className="bg-gold px-8 py-3 text-xs font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald"
            >
              Send Enquiry
            </button>
            {sent && (
              <p className="text-sm italic text-emerald/70">
                Thank you — our concierge will write back within one working day.
              </p>
            )}
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
