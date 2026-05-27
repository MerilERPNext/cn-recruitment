import { GripVertical } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Select } from "../../../../shared/atoms/Select";
import { Typography } from "../../../../shared/atoms/Typography";
import type { StageOption, StageRow } from "./types";

type StagesTimelineCardProps = {
  formOptions: StageOption[];
  ratingOptions: StageOption[];
  stages: StageRow[];
  setStages: Dispatch<SetStateAction<StageRow[]>>;
  visibilityOptions: StageOption[];
};

const selectClass =
  "relative w-full min-w-0 [&>button]:min-h-[42px] [&>button]:rounded-lg [&>button]:border-gray-200 [&>button]:px-3 [&>button]:py-2 [&>button]:text-left [&>button]:text-sm [&>button]:font-medium [&>button]:shadow-sm [&>button]:shadow-gray-100 [&>button_span]:min-w-0 [&>button_span]:font-medium [&>button_svg]:h-4 [&>button_svg]:w-4 [&>button_svg]:shrink-0 [&>button_svg]:text-gray-500 [&>div]:mt-1 [&>div]:w-full [&>div]:min-w-[180px] [&>div]:rounded-lg [&>div]:border-gray-200 [&>div]:p-1 [&>div]:shadow-lg [&>div]:shadow-gray-200/70 [&_ul]:p-0 [&_li]:rounded-md [&_li]:px-3 [&_li]:py-2 [&_li]:text-sm [&_li]:font-medium [&_.bg-primary-50]:bg-blue-600 [&_.text-primary-600]:text-white";

const StagesTimelineCard = ({
  formOptions,
  ratingOptions,
  stages,
  setStages,
  visibilityOptions,
}: StagesTimelineCardProps) => {
  const updateStage = <K extends keyof StageRow>(
    id: number,
    field: K,
    value: StageRow[K],
  ) => {
    setStages((current) =>
      current.map((stage) =>
        stage.id === id ? { ...stage, [field]: value } : stage,
      ),
    );
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Typography variant="h3" className="text-sm font-bold text-gray-900">
            Cycle Timeline
          </Typography>
          <Typography variant="caption" className="mt-1 block text-gray-500">
            10 stages · 56 days total · ends 15 Jul 2026
          </Typography>
        </div>
        <div className="flex gap-2">
          <button className="min-h-[36px] rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50">
            Auto-space
          </button>
          <button className="min-h-[36px] rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50">
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:border-gray-300 hover:shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  className="hidden h-8 w-6 items-center justify-center text-gray-400 lg:flex"
                  aria-label={`Drag ${stage.title}`}
                >
                  <GripVertical className="h-4 w-4" />
                </button>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                  {stage.id}
                </span>

                <div className="min-w-0 flex-1">
                  <Typography
                    variant="bodyMedium"
                    className="break-words text-sm font-bold leading-snug text-gray-900"
                  >
                    {stage.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    className="mt-1 block leading-snug text-gray-500"
                  >
                    SLA: {stage.sla} · Due {stage.dueDate}
                  </Typography>
                </div>
              </div>

              <label className="flex min-h-[34px] w-fit shrink-0 items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 text-sm font-semibold text-blue-700">
                <input
                  type="checkbox"
                  checked={stage.managerVisible}
                  onChange={(event) =>
                    updateStage(
                      stage.id,
                      "managerVisible",
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 rounded-md border-gray-300 accent-blue-500"
                />
                <span>Manager visible</span>
              </label>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:items-center">
              <Select
                options={visibilityOptions}
                value={
                  visibilityOptions.find(
                    (option) => option.value === stage.visibility,
                  ) ?? visibilityOptions[0]
                }
                onChange={(option) =>
                  updateStage(stage.id, "visibility", option.value)
                }
                className={selectClass}
              />

              <Select
                options={formOptions}
                value={
                  formOptions.find(
                    (option) => option.value === stage.formTemplate,
                  ) ?? formOptions[0]
                }
                onChange={(option) =>
                  updateStage(stage.id, "formTemplate", option.value)
                }
                className={selectClass}
              />

              <Select
                options={ratingOptions}
                value={
                  ratingOptions.find(
                    (option) => option.value === stage.ratingScale,
                  ) ?? ratingOptions[0]
                }
                onChange={(option) =>
                  updateStage(stage.id, "ratingScale", option.value)
                }
                className={selectClass}
              />

            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StagesTimelineCard;
