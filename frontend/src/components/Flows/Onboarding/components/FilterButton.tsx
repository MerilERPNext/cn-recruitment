import { memo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";

const FilterButton = () => (
  <button className="flex shrink-0 items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-100">
    <SlidersHorizontal size={14} className="stroke-[2.5]" />
    <Typography variant="bodySmall" className="font-semibold text-blue-600">
      Filter
    </Typography>
  </button>
);

export default memo(FilterButton);
