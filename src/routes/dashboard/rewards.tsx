import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/rewards")({
  component: RewardsPage,
});

const REWARDS = [
  { amount: "Rs 50L.", reward: "Mobile(Android)" },
  { amount: "Rs 1Cr.", reward: "Ev Scooty(30k Dp)" },
  { amount: "Rs 3Cr.", reward: "Bike(65k Dp)" },
  { amount: "Rs 5Cr.", reward: "Four Wheelers(1.55L Dp)" },
  { amount: "Rs 10Cr.", reward: "Four Wheelers(2.5L Dp)" },
  { amount: "Rs 20Cr.", reward: "XUV Car(5L Dp)" },
  { amount: "Rs 50Cr.", reward: "2 BHK Flat(25L Dp)" },
  { amount: "Rs 100Cr.", reward: "2 BHK Flat(50L Dp)" },
];

const VALUES = ["Discipline", "Consistency", "Hard Work", "Focus", "Resilience", "Growth", "Achievement"];

function RewardsPage() {
  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <div className="flex items-start gap-4">
          <div className="h-12 w-1 rounded-full bg-gold" />
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-gold sm:text-4xl lg:text-5xl">
              Awards & Rewards
            </h1>
            <p className="mt-2 text-sm italic text-emerald/60">60:40 ratio accumulation basis</p>
          </div>
        </div>
      </div>

      {/* Reward Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {REWARDS.map((item) => (
          <div
            key={item.amount}
            className="group relative overflow-hidden rounded-lg border border-gold/15 bg-[oklch(0.18_0.04_165)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg hover:shadow-gold/5"
          >
            {/* Gold top accent */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-gold/60 via-gold to-gold/60" />

            <p className="font-display text-3xl font-bold tracking-tight text-gold sm:text-4xl">
              {item.amount}
            </p>
            <p className="mt-3 text-sm text-emerald/60">{item.reward}</p>

            {/* Hover glow */}
            <div className="absolute inset-0 rounded-lg bg-gold/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
        ))}
      </div>

      {/* Values */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-widest text-emerald/50">
        {VALUES.map((v, i) => (
          <span key={v} className="flex items-center gap-2">
            {i > 0 && <span className="text-gold">•</span>}
            <span>{v}</span>
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gold/10 pt-6 text-[10px] uppercase tracking-widest text-emerald/40">
        <span>Prime Jewellery Pvt. Ltd.</span>
        <span>Crafted for a Brighter Tomorrow</span>
      </div>
    </div>
  );
}
