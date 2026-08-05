import React from "react";
import { Award, HandHeart } from "lucide-react";

/**
 * Type badge shown on every history row so Award and Appreciation records stay
 * distinguishable — particularly in the merged "All History" view.
 */
export type HistoryRecordType = "Award" | "Appreciation";

const HistoryTypeBadge: React.FC<{
  type: HistoryRecordType;
  className?: string;
}> = ({ type, className = "" }) => {
  const isAward = type === "Award";
  const Icon = isAward ? Award : HandHeart;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap ${
        isAward ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"
      } ${className}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {type}
    </span>
  );
};

export default HistoryTypeBadge;
