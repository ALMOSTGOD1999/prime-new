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
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg transition-transform hover:scale-[1.02]`}
    >
      {icon && (
        <span className="absolute right-4 top-4 text-4xl opacity-30">{icon}</span>
      )}
      <p className="text-sm font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-90">{title}</p>
      {details && (
        <>
          <div
            className="mt-3 cursor-pointer border-t border-white/20 pt-2"
            onClick={() => setExpanded(!expanded)}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              {expanded ? "Less info ↑" : "More info →"}
            </p>
          </div>
          {expanded && (
            <div className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-relaxed opacity-90">
              {details}
            </div>
          )}
        </>
      )}
    </div>
  );
}
