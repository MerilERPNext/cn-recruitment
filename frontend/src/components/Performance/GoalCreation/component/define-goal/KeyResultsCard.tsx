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
  locked?: boolean;
}

export const KeyResultsCard = ({
  keyResults,
  onDeleteKeyResult,
  onAddKeyResult,
  onUpdateKeyResult,
  maximumKeyResults,
  locked,
}: KeyResultsCardProps) => {
  const totalWeight = keyResults.reduce(
    (sum, kr) => sum + (parseFloat(kr.weight) || 0),
    0,
  );

  return (
    <div className="mt-6 pt-5 border-t border-border">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Typography
              variant="subheading"
              className="text-text-title font-semibold"
            >
              Key Results
            </Typography>
            <Badge
              label={String(keyResults.length)}
              variant="default"
              size="sm"
            />
          </div>
          <Typography variant="caption" className="text-text-body2">
            Quantitative, measurable outcomes that prove the Objective
          </Typography>
        </div>
      </div>

      <div className="space-y-3">
        {keyResults.map((result) => (
          <div
            key={result.id}
            className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-all focus-within:border-primary"
          >
            <div className="shrink-0 [&>div]:h-7 [&>div]:rounded-md [&>div]:px-2 [&>div]:py-0">
              <Badge label={result.id} variant="purple" size="sm" />
            </div>

            <input
              className={`h-10 flex-1 min-w-[200px] rounded-lg border px-3.5 text-sm outline-none transition placeholder:text-text-body2 ${
                locked
                  ? "border-border bg-slate-500/10 text-text-body2 cursor-not-allowed select-none pointer-events-none"
                  : "border-border bg-card text-text-title focus:border-primary focus:ring-1 focus:ring-primary"
              }`}
              value={result.title}
              onChange={(e) =>
                !locked && onUpdateKeyResult(result.id, "title", e.target.value)
              }
              placeholder="Enter Key Result title"
              aria-label={`${result.id} title`}
              disabled={locked}
              readOnly={locked}
            />

            <div className="w-24 shrink-0">
              <input
                type="text"
                className={`h-10 w-full rounded-lg border px-3 text-sm font-medium outline-none transition placeholder:text-text-body2 ${
                  locked
                    ? "border-border bg-slate-500/10 text-text-body2 cursor-not-allowed select-none pointer-events-none"
                    : "border-border bg-card text-text-title focus:border-primary focus:ring-1 focus:ring-primary"
                }`}
                value={result.weight}
                onChange={(e) => {
                  if (locked) return;
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
                    const num = parseFloat(rawVal);
                    if (!isNaN(num)) {
                      const maxAllowed = Math.max(0, 100 - otherSum);
                      const cappedVal = Math.min(num, maxAllowed);
                      onUpdateKeyResult(
                        result.id,
                        "weight",
                        String(cappedVal),
                      );
                    }
                  }
                }}
                placeholder="Weight %"
                aria-label={`${result.id} weightage`}
                disabled={locked}
                readOnly={locked}
              />
            </div>

            {!locked && (
              <button
                type="button"
                onClick={() => onDeleteKeyResult(result.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-body2 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                aria-label={`Delete ${result.id}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {!locked && (
          <button
            type="button"
            onClick={onAddKeyResult}
            disabled={
              maximumKeyResults !== null && keyResults.length >= maximumKeyResults
            }
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-semibold transition cursor-pointer ${
              maximumKeyResults !== null && keyResults.length >= maximumKeyResults
                ? "bg-slate-500/10 text-text-body2 border-border cursor-not-allowed"
                : "bg-card text-primary hover:bg-slate-500/10 hover:border-primary"
            }`}
          >
            <Plus className="h-4 w-4 text-primary" />
            <span>Add Key Result</span>
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs font-semibold text-amber-500 shadow-2xs">
        <span>KR weightage sum</span>
        <span>
          {totalWeight}% (Target: 100%)
        </span>
      </div>
    </div>
  );
};
