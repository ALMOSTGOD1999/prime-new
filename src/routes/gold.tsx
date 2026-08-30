import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "../components/SiteLayout";
import heroGold from "../assets/hero-gold.jpg";
import goldJhumkas from "../assets/gold-jhumkas.jpg";
import goldChoker from "../assets/gold-choker.jpg";
import goldBangles from "../assets/gold-bangles.jpg";
import goldNecklaceBride from "../assets/gold-necklace-bride.jpg";

export const Route = createFileRoute("/gold")({
  head: () => ({
    meta: [
      { title: "Gold Jewellery Collection — Prime Jewellery" },
      {
        name: "description",
        content:
          "22K and 24K handcrafted gold jewellery: temple jhumkas, kundan bangles, bridal necklaces and modern chokers from Prime Jewellery.",
      },
      { property: "og:title", content: "Gold Jewellery Collection — Prime Jewellery" },
      {
        property: "og:description",
        content: "Temple jhumkas, kundan bangles and bridal gold, handcrafted in India.",
      },
    ],
  }),
  component: GoldPage,
});

const pieces = [
  {
    img: heroGold,
    name: "Bridal Kundan Rani Haar",
    price: "₹ 4,80,000",
    note: "22K gold, uncut polki, matched matha patti",
    alt: "Indian bride wearing a heavy gold kundan bridal necklace and matha patti",
  },
  {
    img: goldJhumkas,
    name: "Temple Heritage Jhumkas",
    price: "₹ 85,000",
    note: "Nakashi temple work with pearl fringe",
    alt: "Close up of a bride wearing gold temple jewellery jhumka earrings",
  },
  {
    img: goldChoker,
    name: "Modernist Gold Choker",
    price: "₹ 1,20,000",
    note: "Brushed 22K panels, hidden clasp",
    alt: "Indian model wearing a sleek modern gold choker necklace",
  },
  {
    img: goldBangles,
    name: "Kundan Work Bangles",
    price: "₹ 2,10,000",
    note: "Set of four, ruby and emerald insets",
    alt: "Carved gold bangles on an Indian woman's hands",
  },
  {
    img: goldNecklaceBride,
    name: "Maharani Necklace Set",
    price: "₹ 3,40,000",
    note: "22K gold choker with maang tikka and nath",
    alt: "Indian bride in maroon lehenga wearing an elaborate gold choker necklace set with maang tikka",
  },
];

function GoldPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-36 pb-16">
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.3em] text-gold">
          Collection One
        </h2>
        <h1 className="max-w-3xl text-6xl leading-[0.95] md:text-7xl">
          Gold, <span className="italic text-gold">as our grandmothers</span> wore it
        </h1>
        <p className="mt-8 max-w-xl text-lg text-emerald/70">
          Every piece is struck, carved and polished by hand in our Jaipur workshop, certified for
          purity and made to be handed down.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
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
