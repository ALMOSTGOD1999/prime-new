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
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} p-3 sm:p-5 text-white shadow-lg transition-transform hover:scale-[1.02] min-w-0`}
    >
      {icon && (
        <span className="absolute right-2 top-2 text-2xl sm:text-4xl opacity-30">{icon}</span>
      )}
      <p className="text-lg sm:text-sm font-bold break-words leading-tight">{value}</p>
      <p className="mt-0.5 text-xs sm:text-xs font-semibold opacity-90 break-words">{title}</p>
      {details && (
        <>
          <div
            className="mt-2 sm:mt-3 cursor-pointer border-t border-white/20 pt-2"
            onClick={() => setExpanded(!expanded)}
          >
            <p className="text-[11px] sm:text-[10px] font-semibold uppercase tracking-wider opacity-80">
              {expanded ? "Less ↑" : "More →"}
            </p>
          </div>
          {expanded && (
            <div className="mt-2 border-t border-white/10 pt-2 text-[11px] sm:text-[11px] leading-relaxed opacity-90">
              {details}
            </div>
          )}
        </>
      )}
    </div>
  );
}
