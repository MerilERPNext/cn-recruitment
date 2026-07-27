import { CheckCircle2, Circle } from "lucide-react";
import Badge from "../../../../shared/Badge";
import { Card } from "../../../../shared/atoms/Card";
import { Typography } from "../../../../shared/atoms/Typography";
import type { KeyResult } from "../DefineGoal";

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
  const isTitleFilled = !!goalTitle.trim();
  const isDepartmentFilled = !!department && department.trim() !== "";
  const isDesignationFilled = !!designation && designation.trim() !== "";
  const areKrTitlesFilled = keyResults.length >= minimumKeyResults && keyResults.every((kr) => !!kr.title.trim());
  const krWeightageSum = keyResults.reduce((sum, kr) => sum + (parseFloat(kr.weight) || 0), 0);
  const hasEmptyKrWeightage = keyResults.some(kr => !kr.weight || parseFloat(kr.weight) <= 0);
  const isKrWeightage100 = krWeightageSum === 100 && !hasEmptyKrWeightage;
  const isObjectiveWeightageFilled = weightage > 0;

  const filledKrTitlesCount = keyResults.filter((kr) => !!kr.title.trim()).length;
  const totalKrsCount = keyResults.length;
  
  const checklist = [
    { label: "Objective title", isCompleted: isTitleFilled },
    { label: "Objective weightage is filled", isCompleted: isObjectiveWeightageFilled },
    { label: "Department selected", isCompleted: isDepartmentFilled },
    { label: "Designation selected", isCompleted: isDesignationFilled },
    { label: `Key result titles (${filledKrTitlesCount}/${totalKrsCount})`, isCompleted: areKrTitlesFilled },
    { label: "KR weightage totals 100%", isCompleted: isKrWeightage100 },
  ];

  return (
    <aside className="space-y-4">
      <Card
        className="overflow-hidden border border-gray-200 bg-white shadow-sm"
        radius="xl"
        padding="none"
      >
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Live Preview {goalNumber ? `— Goal ${goalNumber}` : ""}
        </div>

        <div className="p-4">
          <div className="rounded-xl border border-gray-100 bg-slate-50/50 p-4 text-gray-900">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge label={goalType} variant="purple" size="sm" />
              {department && <Badge label={department} variant="default" size="sm" />}
              {designation && <Badge label={designation} variant="info" size="sm" />}
            </div>

            <Typography
              variant="bodyMedium"
              className="text-sm font-semibold text-gray-900"
            >
              {goalTitle.trim() ? goalTitle : "Untitled Objective"}
            </Typography>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
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
                    <span className="truncate text-gray-600 font-medium">
                      {result.title.trim()
                        ? result.title
                        : "Untitled Key Result"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 flex-1 rounded-md bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-md bg-blue-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, weightNum))}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium shrink-0">
                        {weightNum > 0 ? `${weightNum}%` : "0%"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Typography variant="caption" className="mt-3 block text-gray-500">
            Updates as you type - approval required from Rohit Khanna
          </Typography>
        </div>
      </Card>

      <Card
        className="border border-amber-200 bg-[#fffdf1] p-4 shadow-sm"
        radius="xl"
      >
        <Typography
          variant="bodyMedium"
          className="font-semibold text-amber-800"
        >
          {minimumKeyResults} KR{minimumKeyResults === 1 ? "" : "s"} minimum · {maximumKeyResults === null ? "No maximum" : `${maximumKeyResults} KRs maximum`}
        </Typography>
        <Typography variant="caption" className="mt-1 block text-amber-700">
          Most high-performing PW OKRs have 3-4 KRs. More than 5 dilutes focus.
        </Typography>
      </Card>

      <Card
        className="overflow-hidden border border-gray-200 bg-white shadow-sm"
        radius="xl"
        padding="none"
      >
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Required Fields
        </div>
        <div className="p-4">
          <ul className="space-y-2.5">
          {checklist.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              {item.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 shrink-0" />
              )}
              <Typography
                variant="caption"
                className={item.isCompleted ? "text-gray-700" : "text-gray-500"}
              >
                {item.label}
              </Typography>
            </li>
          ))}
          </ul>
        </div>
      </Card>
    </aside>
  );
};
