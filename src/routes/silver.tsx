import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import silverHero from "@/assets/silver-hero.jpg";
import silverNecklace from "@/assets/silver-necklace.jpg";
import silverStuds from "@/assets/silver-studs.jpg";
import silverAnklets from "@/assets/silver-anklets.jpg";
import silverTribal from "@/assets/silver-tribal.jpg";

export const Route = createFileRoute("/silver")({
  head: () => ({
    meta: [
      { title: "Silver Jewellery Collection — Prime Jewellery" },
      {
        name: "description",
        content:
          "925 sterling silver jewellery from Prime Jewellery: oxidised tribal necklaces, minimalist studs, anklets and bracelets.",
      },
      { property: "og:title", content: "Silver Jewellery Collection — Prime Jewellery" },
      {
        property: "og:description",
        content: "Oxidised tribal necklaces, minimalist studs and anklets in 925 sterling silver.",
      },
    ],
  }),
  component: SilverPage,
});

const pieces = [
  {
    img: silverHero,
    name: "Moonlight Floral Necklace",
    price: "₹ 18,500",
    note: "Oxidised 925 silver with pearl drops",
    alt: "Indian model wearing an oxidised silver floral necklace and earrings",
  },
  {
    img: silverNecklace,
    name: "Coin Tribal Haar",
    price: "₹ 24,000",
    note: "Hand-stamped coin medallions",
    alt: "Indian model wearing an oxidised silver tribal coin necklace",
  },
  {
    img: silverStuds,
    name: "Solitaire Silver Studs",
    price: "₹ 4,200",
    note: "Everyday 925 silver, zircon centre",
    alt: "Close up of an Indian woman wearing a minimalist silver stud earring",
  },
  {
    img: silverAnklets,
    name: "Payal Ghungroo Anklets",
    price: "₹ 9,800",
    note: "Pair, with matching bracelet",
    alt: "Silver anklets and bracelet worn by an Indian woman",
  },
  {
    img: silverTribal,
    name: "Rajwada Oxidised Choker",
    price: "₹ 15,200",
    note: "Statement choker with jhumka earrings and bangles",
    alt: "Indian woman in a green silk saree wearing a heavy oxidised silver tribal choker and jhumka earrings",
  },
];

function SilverPage() {
  return (
    <SiteLayout>
      <section className="bg-emerald pt-36 pb-20 text-cream">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.3em] text-gold">
            Collection Two
          </h2>
          <h1 className="max-w-3xl text-6xl leading-[0.95] md:text-7xl">
            Silver, <span className="italic text-gold">worn like moonlight</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-cream/70">
            925 sterling silver shaped for daily wear — oxidised tribal statement pieces beside
            studs quiet enough for the office.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">
          {pieces.map((piece, i) => (
            <article key={piece.name} className={`group ${i % 2 === 1 ? "md:mt-20" : ""}`}>
              <img
                src={piece.img}
                loading="lazy"
                width={704}
                height={944}
                alt={piece.alt}
                className="mb-5 aspect-[3/4] w-full object-cover outline-1 -outline-offset-1 outline-black/5 transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <h3 className="text-2xl">{piece.name}</h3>
              <p className="mt-1 text-sm text-emerald/60">{piece.note}</p>
              <p className="mt-2 text-sm font-semibold text-gold">{piece.price}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
