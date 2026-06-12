import Badge from "../../../../shared/Badge";
import { Select } from "../../../../shared/atoms/Select";
import type {
  CalibratedRatings,
  CalibratorEmployee,
  Rating,
  RatingOption,
} from "../../types";

type MobileEmployeeCardsProps = {
  calibratedRatings: CalibratedRatings;
  employees: CalibratorEmployee[];
  getBadgeColor: (index: number) => string;
  onOpenOverride: (employeeId: number) => void;
  onRatingChange: (employeeId: number, rating: Rating) => void;
  ratingColorIndex: Record<Rating | "Unsatisfactory", number>;
  ratingOptions: RatingOption[];
  ratingTextColor: Record<Rating, string>;
};

const MobileEmployeeCards = ({
  calibratedRatings,
  employees,
  getBadgeColor,
  onOpenOverride,
  onRatingChange,
  ratingColorIndex,
  ratingOptions,
  ratingTextColor,
}: MobileEmployeeCardsProps) => {
  return (
    <section className="space-y-3 md:hidden">
      {employees.map((employee) => {
        const selectedRating =
          ratingOptions.find((option) => option.value === calibratedRatings[employee.id]) ??
          ratingOptions[0];

        return (
          <article
            key={employee.id}
            className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-500">
                {employee.initials}
              </span>
              <div className="min-w-0 flex-1">
                <button
                  className="break-words text-left text-sm font-bold text-gray-900 hover:text-blue-600"
                  onClick={() => onOpenOverride(employee.id)}
                >
                  {employee.name}
                </button>
                <div className="mt-0.5 text-xs font-medium leading-relaxed text-gray-500">
                  {employee.detail}
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-600">
                  Manager: {employee.manager}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "FY26 Self", value: employee.self },
                { label: "Manager Suggested", value: employee.managerSuggested },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-gray-50 p-3">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    {item.label}
                  </div>
                  <Badge
                    label={item.value}
                    backgroundColor={getBadgeColor(ratingColorIndex[item.value])}
                    textColor=""
                    size="sm"
                  />
                </div>
              ))}
              <div className={`rounded-lg p-3 ${employee.override ? "bg-amber-50" : "bg-blue-50"}`}>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Calibrated
                </div>
                <Select
                  options={ratingOptions}
                  value={selectedRating}
                  onChange={(option) => {
                    onRatingChange(employee.id, option.value);
                    onOpenOverride(employee.id);
                  }}
                  className={`relative w-full [&>button]:min-h-[36px] [&>button]:rounded-md [&>button]:border-gray-200 [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-xs [&>button]:font-bold [&>button]:shadow-sm [&>button_span]:font-bold [&>div]:mt-1 [&>div]:w-full [&>div]:rounded-none [&>div]:p-0 [&_li]:rounded-none [&_li]:px-3 [&_li]:py-1.5 ${ratingTextColor[selectedRating.value]}`}
                />
                {employee.override && (
                  <span className="mt-1 block text-[10px] font-bold uppercase text-amber-700">
                    + Override
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_72px]">
              <div className="rounded-lg bg-[#f3f7ff] p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Prior Cycles
                </div>
                <div className="flex flex-wrap gap-2">
                  {employee.prior.map((rating, index) => (
                    <span key={`${employee.id}-mobile-${index}`} className="inline-flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-400">
                        FY{23 + index}
                      </span>
                      {rating ? (
                        <Badge
                          label={rating === "Unsatisfactory" ? "Unsati" : rating}
                          backgroundColor={getBadgeColor(ratingColorIndex[rating])}
                          textColor=""
                          size="sm"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-400">-</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  9-Box
                </div>
                <div className="grid h-[52px] w-[52px] grid-cols-3 gap-0.5">
                  {Array.from({ length: 9 }).map((_, index) => {
                    const row = Math.floor(index / 3);
                    const col = index % 3;
                    const active = col === employee.nineBox[0] && row === employee.nineBox[1];

                    return (
                      <span
                        key={index}
                        className={`rounded-[3px] ${
                          active ? "bg-blue-500 ring-2 ring-white" : "bg-gray-200"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {employee.flag && (
              <div className="mt-4">
                <Badge
                  label={employee.flag.label}
                  backgroundColor={getBadgeColor(employee.flag.tone === "green" ? 2 : 4)}
                  textColor=""
                  size="sm"
                />
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
};

export default MobileEmployeeCards;
