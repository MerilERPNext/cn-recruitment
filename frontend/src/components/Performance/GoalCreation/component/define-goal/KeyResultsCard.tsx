import { Plus, X } from "lucide-react";
import Badge from "../../../../shared/Badge";
import { Typography } from "../../../../shared/atoms/Typography";
import type { KeyResult } from "../DefineGoal";

interface KeyResultsCardProps {
  keyResults: KeyResult[];
  onDeleteKeyResult: (id: string) => void;
  onAddKeyResult: () => void;
  onUpdateKeyResult: (
    id: string,
    field: "title" | "weight",
    value: string,
  ) => void;
  minimumKeyResults: number;
  maximumKeyResults: number | null;
}

export const KeyResultsCard = ({
  keyResults,
  onDeleteKeyResult,
  onAddKeyResult,
  onUpdateKeyResult,
  maximumKeyResults,
}: KeyResultsCardProps) => {
  const totalWeight = keyResults.reduce(
    (sum, kr) => sum + (parseFloat(kr.weight) || 0),
    0,
  );

  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Typography
              variant="subheading"
              className="text-gray-900 font-semibold"
            >
              Key Results
            </Typography>
            <Badge
              label={String(keyResults.length)}
              variant="default"
              size="sm"
            />
          </div>
          <Typography variant="caption" className="text-gray-500">
            Quantitative, measurable outcomes that prove the Objective
          </Typography>
        </div>
      </div>

      <div className="space-y-3">
        {keyResults.map((result) => (
          <div
            key={result.id}
            className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all focus-within:border-blue-300"
          >
            <div className="shrink-0 [&>div]:h-7 [&>div]:rounded-md [&>div]:px-2 [&>div]:py-0">
              <Badge label={result.id} variant="purple" size="sm" />
            </div>

            <input
              className="h-10 flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
              value={result.title}
              onChange={(e) =>
                onUpdateKeyResult(result.id, "title", e.target.value)
              }
              placeholder="Enter Key Result title"
              aria-label={`${result.id} title`}
            />

            <div className="w-24 shrink-0">
              <input
                type="text"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400"
                value={result.weight}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  if (rawVal === "") {
                    onUpdateKeyResult(result.id, "weight", "");
                    return;
                  }
                  if (/^\d*\.?\d*$/.test(rawVal)) {
                    const otherSum = keyResults
                      .filter((kr) => kr.id !== result.id)
                      .reduce(
                        (sum, kr) => sum + (parseFloat(kr.weight) || 0),
                        0,
                      );
                    const maxAllowed = Math.max(0, 100 - otherSum);
                    const num = parseFloat(rawVal);
                    if (!isNaN(num)) {
                      const cappedVal = Math.min(num, maxAllowed);
                      onUpdateKeyResult(result.id, "weight", String(cappedVal));
                    }
                  }
                }}
                placeholder="Weight %"
                aria-label={`${result.id} weight`}
              />
            </div>

            <button
              type="button"
              onClick={() => onDeleteKeyResult(result.id)}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              aria-label={`Delete ${result.id}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {(maximumKeyResults === null || keyResults.length < maximumKeyResults) && (
        <button
          type="button"
          onClick={onAddKeyResult}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 text-sm font-medium text-violet-700 hover:border-violet-200 hover:bg-violet-50 transition-colors"
          aria-label="Add key result"
        >
          <Plus className="h-4 w-4" />
          Add Key Result
        </button>
      )}

      <div
        className={`mt-4 flex items-center justify-between rounded-lg px-4 py-2.5 text-sm ${totalWeight === 100 ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
      >
        <span className="font-medium">KR weightage sum</span>
        <span
          className={`font-semibold ${totalWeight === 100 ? "text-emerald-700" : "text-amber-700"}`}
        >
          {totalWeight}% {totalWeight === 100 ? "→ valid" : "(Target: 100%)"}
        </span>
      </div>
    </div>
  );
};
