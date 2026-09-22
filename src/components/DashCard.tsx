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
      <div className="flex flex-col items-center justify-center px-4 py-5 text-center sm:px-6 sm:py-7">
        <p className="text-2xl font-bold leading-tight sm:text-3xl">{value}</p>
        <p className="mt-0.5 text-xs font-semibold opacity-90 sm:text-sm">{title}</p>
      </div>

      {/* More info button */}
      {details && (
        <div
          className="cursor-pointer border-t border-white/20 bg-white/10 px-4 py-2.5 text-center transition-colors hover:bg-white/20 sm:px-6"
          onClick={() => setExpanded(!expanded)}
        >
          <p className="text-[11px] font-semibold tracking-wide sm:text-xs">
            {expanded ? "Less ↑" : "More info →"}
          </p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && details && (
        <div className="border-t border-white/10 px-4 py-3 text-[11px] leading-relaxed opacity-90 sm:px-6 sm:text-xs">
          {details}
        </div>
      )}
    </div>
  );
}
