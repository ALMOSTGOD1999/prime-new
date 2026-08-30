import { useEffect, useState } from "react";

interface Segment {
  text: string;
  className?: string;
  href?: string;
}

interface TypewriterProps {
  segments: Segment[];
  speed?: number;
  delay?: number;
  className?: string;
  cursorClassName?: string;
}

export function Typewriter({
  segments,
  speed = 80,
  delay = 1000,
  className,
  cursorClassName = "ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-gold align-middle",
}: TypewriterProps) {
  const [count, setCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const total = segments.reduce((sum, segment) => sum + segment.text.length, 0);

  useEffect(() => {
    setCount(0);
    setFinished(false);
    const startTimeout = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += 1;
        setCount(current);
        if (current >= total) {
          clearInterval(interval);
          setFinished(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [segments, speed, delay, total]);

  let remaining = count;
  const rendered = segments.map((segment, index) => {
    const take = Math.min(segment.text.length, Math.max(0, remaining));
    remaining -= take;
    const text = segment.text.slice(0, take);
    if (!text) return null;

    if (segment.href) {
      return (
        <a
          key={index}
          href={segment.href}
          target="_blank"
          rel="noopener noreferrer"
          className={segment.className}
        >
          {text}
        </a>
      );
    }

    return (
      <span key={index} className={segment.className}>
        {text}
      </span>
    );
  });

  return (
    <span className={className}>
      {rendered}
      {!finished && (
        <span className={cursorClassName} aria-hidden="true" />
      )}
    </span>
  );
}
