import type { Dispatch, SetStateAction } from "react";
import { Typography } from "../../../shared/atoms/Typography";

export type EligibilityExclusion = {
  label: string;
  count: string;
  checked: boolean;
};

type EligibilityExclusionsCardProps = {
  exclusions: EligibilityExclusion[];
  selectedExclusions: Record<string, boolean>;
  setSelectedExclusions: Dispatch<SetStateAction<Record<string, boolean>>>;
};

const EligibilityExclusionsCard = ({
  exclusions,
  selectedExclusions,
  setSelectedExclusions,
}: EligibilityExclusionsCardProps) => {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
      <Typography variant="h3" className="text-base font-bold text-gray-900">
        Exclusions & Overrides
      </Typography>
      <Typography variant="bodyMedium" className="mt-1 text-sm font-normal text-gray-500">
        People matching the rules above who should NOT participate
      </Typography>

      <div className="mt-4 space-y-3">
        {exclusions.map((item) => (
          <label
            key={item.label}
            className="flex min-h-[42px] flex-col items-start justify-between gap-2 rounded-md bg-gray-50 px-3 py-3 text-sm text-gray-700 sm:flex-row sm:items-center"
          >
            <span className="flex min-w-0 items-center gap-3">
              <input
                type="checkbox"
                checked={selectedExclusions[item.label]}
                onChange={(event) =>
                  setSelectedExclusions((current) => ({
                    ...current,
                    [item.label]: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 accent-blue-500"
              />
              <span className="min-w-0 break-words">{item.label}</span>
            </span>
            <span className="pl-7 text-xs font-semibold text-gray-500 sm:pl-0">
              {item.count}
            </span>
          </label>
        ))}
      </div>

      <button className="mt-4 min-h-[36px] rounded-md border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700">
        + Add individual override
      </button>
    </section>
  );
};

export default EligibilityExclusionsCard;
