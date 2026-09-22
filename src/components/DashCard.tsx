import { useState } from "react";

export function DashCard({
  title,
  value,
  gradient,
  icon,
  details,
}: {
  title: string;
  value: string | number;
  gradient: string;
  icon?: string;
  details?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform hover:scale-[1.01]`}
    >
      {/* Main content — centered */}
      <div className="flex flex-col items-center justify-center px-5 py-6 sm:py-8 text-center">
        <p className="text-3xl sm:text-4xl font-bold leading-tight">{value}</p>
        <p className="mt-1 text-sm sm:text-base font-semibold opacity-90">{title}</p>
      </div>

      {/* More info button */}
      {details && (
        <div
          className="cursor-pointer border-t border-white/20 bg-white/10 px-5 py-3 text-center transition-colors hover:bg-white/20"
          onClick={() => setExpanded(!expanded)}
        >
          <p className="text-xs sm:text-sm font-semibold tracking-wide">
            {expanded ? "Less ↑" : "More info →"}
          </p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && details && (
        <div className="border-t border-white/10 px-5 py-3 text-xs sm:text-sm leading-relaxed opacity-90">
          {details}
        </div>
      )}
    </div>
  );
}
