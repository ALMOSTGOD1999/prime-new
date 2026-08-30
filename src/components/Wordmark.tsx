type WordmarkProps = {
  className?: string;
  showText?: boolean;
};

/**
 * Prime Jewellery logo — gold interlocking diamonds with "PRIME" text.
 */
export function Wordmark({ className = "", showText = true }: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/logo.svg"
        alt="Prime Jewellery"
        className="h-10 w-auto"
        width={100}
        height={110}
      />
      {!showText && null}
    </span>
  );
}
