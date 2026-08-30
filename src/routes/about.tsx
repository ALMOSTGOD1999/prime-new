import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "../components/SiteLayout";
import goldBangles from "../assets/gold-bangles.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Prime Jewellery" },
      {
        name: "description",
        content:
          "Since 1984 Prime Jewellery has handcrafted Indian gold and silver jewellery in Jaipur, preserving temple and kundan techniques across five generations.",
      },
      { property: "og:title", content: "About Us — Prime Jewellery" },
      {
        property: "og:description",
        content: "Five generations of Indian goldsmiths, crafting heirlooms in Jaipur since 1984.",
      },
    ],
  }),
  component: AboutPage,
});

const milestones = [
  { year: "1984", text: "A single workbench in Johari Bazaar, Jaipur." },
  { year: "1999", text: "The first Prime bridal kundan suite is commissioned." },
  { year: "2012", text: "Sterling silver studio opens for everyday wear." },
  { year: "2026", text: "Boutiques in Mumbai and Delhi, artisans still in Jaipur." },
];

function AboutPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-36 pb-20">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div>
            <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.3em] text-gold">
              Our Story
            </h2>
            <h1 className="text-6xl leading-[0.95] md:text-7xl">
              Five generations <span className="italic text-gold">of hands</span>
            </h1>
            <p className="mt-8 text-lg text-emerald/70">
              We do not manufacture jewellery — we finish it. Every setting is closed by an artisan
              who learned the craft from the person at the next bench, in techniques that predate
              the machines that could replace them.
            </p>
            <p className="mt-6 text-emerald/70">
              Gold is certified for purity, diamonds are ethically sourced, and every piece leaves
              the workshop with the name of the person who made it.
            </p>
          </div>
          <img
            src={goldBangles}
            loading="lazy"
            width={704}
            height={944}
            alt="Carved gold bangles worn by an Indian woman in a silk saree"
            className="aspect-[3/4] w-full rounded-sm object-cover shadow-2xl outline-1 -outline-offset-1 outline-black/5"
          />
        </div>
      </section>

      <section className="bg-emerald py-24 text-cream">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-4xl">A Slow Timeline</h2>
          <div className="space-y-6">
            {milestones.map((m) => (
              <div
                key={m.year}
                className="flex items-baseline space-x-8 border-b border-cream/20 pb-4"
              >
                <span className="font-display text-2xl italic text-gold">{m.year}</span>
                <span className="text-lg text-cream/80">{m.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
