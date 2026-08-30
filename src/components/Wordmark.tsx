type WordmarkProps = {
  className?: string;
  diamondClassName?: string;
};

/**
 * "Prime Jewellery" with a shining diamond standing in for the dot of the "i".
 * Uses the dotless "ı" so the diamond is the only dot.
 */
export function Wordmark({ className = "", diamondClassName = "" }: WordmarkProps) {
  return (
    <span className={`font-display inline-flex items-baseline tracking-tight ${className}`}>
      Pr
      <span className="relative inline-block">
        ı
        <span
          aria-hidden
          className={`diamond-dot absolute left-1/2 -top-[0.18em] block size-[0.16em] -translate-x-1/2 bg-gold ${diamondClassName}`}
        />
      </span>
      me&nbsp;Jewellery
    </span>
  );
}
