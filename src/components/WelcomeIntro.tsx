import { useEffect, useState } from "react";

const WORD = "Prime Jewellery";
const CORNERS = ["fly-in-tl", "fly-in-tr", "fly-in-bl", "fly-in-br"];
const DELAYS = [0.1, 0.3, 0.2, 0.4, 0.5, 0.2, 0.6, 0.3, 0.7, 0.1, 0.4, 0.8, 0.2, 0.5];

const GEMS = [
  { id: 1, shape: "diamond", left: "8%", top: "30%", size: 1.1, delay: 0, duration: 3.4 },
  { id: 2, shape: "diamond", left: "18%", top: "72%", size: 0.7, delay: 0.6, duration: 4 },
  { id: 3, shape: "diamond", left: "30%", top: "12%", size: 0.9, delay: 1.1, duration: 3.2 },
  { id: 4, shape: "diamond", left: "45%", top: "84%", size: 1.2, delay: 0.3, duration: 4.2 },
  { id: 5, shape: "diamond", left: "62%", top: "10%", size: 0.6, delay: 0.9, duration: 3.6 },
  { id: 6, shape: "diamond", left: "76%", top: "66%", size: 1, delay: 1.4, duration: 3 },
  { id: 7, shape: "diamond", left: "88%", top: "34%", size: 0.8, delay: 0.2, duration: 3.8 },
  { id: 8, shape: "diamond", left: "92%", top: "80%", size: 0.5, delay: 1.8, duration: 4.4 },
  { id: 9, shape: "gem", left: "12%", top: "55%", size: 1.4, delay: 0.5, duration: 4.6 },
  { id: 10, shape: "gem", left: "55%", top: "20%", size: 1, delay: 1.2, duration: 3.5 },
  { id: 11, shape: "gem", left: "84%", top: "50%", size: 1.3, delay: 0.8, duration: 4.1 },
  { id: 12, shape: "gem", left: "38%", top: "68%", size: 0.9, delay: 1.6, duration: 3.3 },
] as const;

export function WelcomeIntro() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), 4200);
    return () => window.clearTimeout(timer);
  }, []);

  if (done) return null;

  let letterIndex = -1;

  return (
    <div
      aria-hidden
      className="intro-screen fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-cream"
    >
      {/* Floating jewellery & diamond background */}
      <div className="absolute inset-0">
        {GEMS.map((gem) => (
          <span
            key={gem.id}
            className={`gem-float absolute ${gem.shape === "diamond" ? "gem-diamond" : "gem-gem"}`}
            style={{
              left: gem.left,
              top: gem.top,
              width: `${gem.size}em`,
              height: `${gem.size}em`,
              animationDelay: `${gem.delay}s`,
              animationDuration: `${gem.duration}s`,
            }}
          />
        ))}
        <span className="gem-ring absolute left-[12%] top-[20%] size-16 rounded-full border-2 border-gold/30" />
        <span className="gem-ring absolute right-[10%] bottom-[18%] size-24 rounded-full border-2 border-gold/20" />
        <span className="gem-ring absolute left-[22%] bottom-[12%] size-10 rounded-full border border-gold/30" />
      </div>
      <div className="font-display flex items-baseline text-4xl tracking-tight text-emerald md:text-7xl">
        {WORD.split("").map((char, i) => {
          if (char === " ") return <span key={i} className="w-[0.35em]" />;
          letterIndex += 1;
          const idx = letterIndex;
          const isDotI = idx === 2;
          return (
            <span
              key={i}
              className="intro-letter relative"
              style={{
                animationName: CORNERS[idx % CORNERS.length],
                animationDelay: `${DELAYS[idx % DELAYS.length]}s`,
              }}
            >
              {isDotI ? "ı" : char}
              {isDotI && (
                <span
                  className="diamond-dot absolute left-1/2 -top-[0.16em] block size-[0.15em] -translate-x-1/2 bg-gold"
                  style={{ animationDelay: "1.4s" }}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
