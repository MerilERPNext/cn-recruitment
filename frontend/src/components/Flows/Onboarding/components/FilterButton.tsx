import { memo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";

const FilterButton = () => (
  <button className="flex shrink-0 items-center justify-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-text-link rounded-lg transition-colors border border-primary/20">
    <SlidersHorizontal size={14} className="stroke-[2.5]" />
    <Typography variant="bodySmall" className="font-semibold text-text-link">
      Filter
    </Typography>
  </button>
);

export default memo(FilterButton);
