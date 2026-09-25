import { useState } from "react";

export function DashCard({
  title,
  value,
  gradient,
  icon,
  details,
  onMoreInfo,
}: {
  title: string;
  value: string | number;
  gradient: string;
  icon?: string;
  details?: React.ReactNode;
  onMoreInfo?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform hover:scale-[1.01]`}
    >
      {/* Main content — centered */}
      <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
        <p className="text-3xl font-bold leading-tight">{value}</p>
        <p className="mt-1 text-sm font-semibold">{title}</p>
      </div>

      {/* More info button — opens a member modal (onMoreInfo) or expands inline details */}
      {(details || onMoreInfo) && (
        <div
          className="cursor-pointer border-t-2 border-white/30 bg-black/10 px-5 py-3 text-center transition-colors hover:bg-black/15"
          onClick={() => (onMoreInfo ? onMoreInfo() : setExpanded(!expanded))}
        >
          <p className="text-xs font-bold tracking-wide">
            {!onMoreInfo && expanded ? "Less ↑" : "More info ⊕"}
          </p>
        </div>
      )}

      {/* Expanded details */}
      {!onMoreInfo && expanded && details && (
        <div className="border-t border-white/20 px-5 py-3 text-xs leading-relaxed">
          {details}
        </div>
      )}
    </div>
  );
}
