import { CheckCircle2, Circle } from "lucide-react";
import Badge from "../../../../shared/Badge";
import { Card } from "../../../../shared/atoms/Card";
import { Typography } from "../../../../shared/atoms/Typography";
import type { KeyResult } from "../DefineGoal";
import { useCurrentEmployeeDetails } from "../../../../../hooks/useEmployee";

interface LivePreviewCardProps {
  goalType?: string;
  goalTitle?: string;
  department?: string;
  designation?: string;
  weightage: number;
  keyResults: KeyResult[];
  goalNumber?: number;
  minimumKeyResults: number;
  maximumKeyResults: number | null;
}

export const LivePreviewCard = ({
  goalType = "OKR",
  goalTitle = "",
  department,
  designation,
  weightage,
  keyResults,
  goalNumber,
  minimumKeyResults,
  maximumKeyResults,
}: LivePreviewCardProps) => {
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const approverName = currentEmployee?.reports_to_name || "Manager";

  const isTitleFilled = !!goalTitle.trim();
  const isDepartmentFilled = !!department && department.trim() !== "";
  const isDesignationFilled = !!designation && designation.trim() !== "";

  const isObjectiveWeightageFilled = weightage > 0;

  const krsWithTitle = keyResults.filter((kr) => !!kr.title.trim());
  const hasAnyKrTitle = krsWithTitle.length > 0;
  const krWeightageSum = keyResults.reduce((sum, kr) => sum + (parseFloat(kr.weight) || 0), 0);
  const hasEmptyKrWeightage = krsWithTitle.some(kr => !kr.weight || parseFloat(kr.weight) <= 0);
  const isKrWeightage100 = krWeightageSum === 100 && !hasEmptyKrWeightage;

  const checklist = [
    { label: "Objective title", isCompleted: isTitleFilled },
    { label: "Objective weightage is filled", isCompleted: isObjectiveWeightageFilled },
    { label: "Department selected", isCompleted: isDepartmentFilled },
    { label: "Designation selected", isCompleted: isDesignationFilled },
    ...(hasAnyKrTitle ? [{ label: "KR weightage totals 100%", isCompleted: isKrWeightage100 }] : []),
  ];

  return (
    <aside className="space-y-4">
      <Card
        className="overflow-hidden border border-border bg-card shadow-sm"
        radius="xl"
        padding="none"
      >
        <div className="border-b border-border bg-slate-500/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-body2">
          Live Preview {goalNumber ? `— Goal ${goalNumber}` : ""}
        </div>

        <div className="p-4">
          <div className="rounded-xl border border-border bg-slate-500/10 p-4 text-text-title">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge label={goalType || "OKR"} variant="purple" size="sm" />
              {department && <Badge label={department} variant="default" size="sm" />}
              {designation && <Badge label={designation} variant="info" size="sm" />}
            </div>

            <Typography
              variant="bodyMedium"
              className="text-sm break-words font-semibold text-text-title"
            >
              {goalTitle.trim() ? goalTitle : "Untitled Objective"}
            </Typography>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-text-body2">
              <span>{weightage}% weight</span>
              <span>Q1-Q3 FY26</span>
              <span>{keyResults.length} KRs</span>
            </div>

            <div className="mt-3 space-y-2">
              {keyResults.map((result) => {
                const weightNum = parseFloat(result.weight) || 0;
                return (
                  <div
                    key={result.id}
                    className="grid grid-cols-[auto_1fr_60px] items-center gap-2 text-[11px]"
                  >
                    <Badge label={result.id} variant="purple" size="sm" />
                    <span className="truncate text-text-body2 font-medium">
                      {result.title.trim()
                        ? result.title
                        : "Untitled Key Result"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 flex-1 rounded-md bg-slate-500/20 overflow-hidden">
                        <div
                          className="h-full rounded-md bg-primary transition-all"
                          style={{ width: `${Math.min(weightNum, 100)}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-medium text-text-body2">
                        {weightNum}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-text-body2">
            Updates as you type — approval required from {approverName}
          </div>
        </div>
      </Card>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <Typography
          variant="subheading"
          className="font-bold text-amber-500 mb-1"
        >
          {minimumKeyResults > 0 ? `Min: ${minimumKeyResults}` : "No minimum"} - {maximumKeyResults ? `Max: ${maximumKeyResults}` : "No maximum"}
        </Typography>
        <Typography variant="bodyMedium" className="text-xs text-amber-400/90 leading-relaxed">
          Most high-performing PW OKRs have 3–4 KRs. More than 5 dilutes focus.
        </Typography>
      </div>

      <Card
        className="border border-border bg-card p-4 shadow-sm"
        radius="xl"
      >
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-body2">
          Required Fields
        </div>

        <div className="space-y-2">
          {checklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-xs"
            >
              {item.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-text-body2 shrink-0" />
              )}
              <span
                className={
                  item.isCompleted
                    ? "font-medium text-text-title"
                    : "text-text-body2"
                }
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
};
