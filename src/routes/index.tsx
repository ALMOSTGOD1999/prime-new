import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "../components/SiteLayout";
import { WelcomeIntro } from "../components/WelcomeIntro";
import heroGold from "../assets/hero-gold.jpg";
import goldJhumkas from "../assets/gold-jhumkas.jpg";
import goldChoker from "../assets/gold-choker.jpg";
import goldBangles from "../assets/gold-bangles.jpg";
import silverHero from "../assets/silver-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prime Jewellery — Handcrafted Indian Gold & Silver" },
      {
        name: "description",
        content:
          "Prime Jewellery crafts heritage Indian gold and sterling silver jewellery. Explore temple jhumkas, kundan bangles and oxidised silver collections.",
      },
      { property: "og:title", content: "Prime Jewellery — Handcrafted Indian Gold & Silver" },
      {
        property: "og:description",
        content: "Heritage Indian gold and sterling silver jewellery, crafted since 1984.",
      },
    ],
  }),
  component: Home,
});

const goldPieces = [
  { img: goldJhumkas, name: "Temple Heritage Jhumkas", price: "₹ 85,000", offset: false },
  { img: goldChoker, name: "Modernist Gold Choker", price: "₹ 1,20,000", offset: true },
  { img: goldBangles, name: "Kundan Work Bangles", price: "₹ 2,10,000", offset: false },
];

const silverLines = [
  "Oxidised Tribal Necklaces",
  "Minimalist Silver Studs",
  "Silver Anklets & Bracelets",
];

function Home() {
  return (
    <>
      <WelcomeIntro />
      <SiteLayout>
        <section className="mx-auto max-w-7xl px-6 pt-32">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h1 className="mb-6 text-6xl leading-[0.9] md:text-8xl">
                Timeless <br />
                <span className="italic text-gold">Elegance</span>
              </h1>
              <p className="mb-8 max-w-md text-lg text-emerald/70">
                Crafting legacies since 1984. Explore our curated collections of handcrafted Indian
                heritage jewellery designed for the modern queen.
              </p>
              <Link
                to="/gold"
                className="inline-block border-b-2 border-gold pb-1 text-sm font-bold uppercase tracking-widest transition-colors hover:text-gold"
              >
                Discover Collection
              </Link>
            </div>
            <div className="relative">
              <img
                src={heroGold}
                width={800}
                height={1008}
                alt="Indian model wearing an elaborate gold bridal necklace and matha patti"
                className="aspect-[4/5] w-full rounded-sm object-cover shadow-2xl outline-1 -outline-offset-1 outline-black/5"
              />
              <div className="absolute -bottom-6 -left-6 hidden bg-gold p-8 text-cream lg:block">
                <span className="font-display text-4xl italic">24K</span>
                <p className="mt-2 text-[10px] uppercase tracking-widest">Purest Gold Only</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="mb-2 font-sans text-sm font-semibold uppercase tracking-[0.3em] text-gold">
                Royal Collections
              </h2>
              <h3 className="text-4xl">Pure Gold Masterpieces</h3>
            </div>
            <Link to="/gold" className="text-xs font-bold uppercase tracking-widest">
              View All Gold
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {goldPieces.map((piece) => (
              <div key={piece.name} className={`group ${piece.offset ? "mt-12" : ""}`}>
                <img
                  src={piece.img}
                  loading="lazy"
                  width={704}
                  height={944}
                  alt={piece.name}
                  className="mb-4 aspect-[3/4] w-full object-cover outline-1 -outline-offset-1 outline-black/5 transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <h4 className="text-xl">{piece.name}</h4>
                <p className="text-sm font-semibold text-gold">{piece.price}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-emerald py-24 text-cream">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-16 md:grid-cols-2">
              <div className="order-2 md:order-1">
                <img
                  src={silverHero}
                  loading="lazy"
                  width={800}
                  height={1008}
                  alt="Indian model wearing oxidised silver necklace and earrings"
                  className="aspect-[4/5] w-full rounded-sm object-cover outline-1 -outline-offset-1 outline-white/10"
                />
              </div>
              <div className="order-1 md:order-2">
                <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.3em] text-gold">
                  Sterling Silver
                </h2>
                <h3 className="mb-6 text-5xl">
                  Contemporary <br />
                  Refinement
                </h3>
                <p className="mb-8 text-cream/70">
                  Discover the versatility of our 925 sterling silver collection. From oxidised
                  tribal designs to minimal office wear, each piece is a statement of grace.
                </p>
                <div className="space-y-6">
                  {silverLines.map((line, i) => (
                    <Link
                      key={line}
                      to="/silver"
                      className="flex cursor-pointer items-center space-x-4 border-b border-cream/20 pb-4 transition-colors hover:border-gold"
                    >
                      <span className="font-display text-2xl italic text-gold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-lg">{line}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
