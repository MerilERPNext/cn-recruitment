import Badge from "../../../../shared/Badge";
import { Select } from "../../../../shared/atoms/Select";
import type {
  CalibratedRatings,
  CalibratorEmployee,
  Rating,
  RatingOption,
} from "../../types";

type EmployeeCalibrationTableProps = {
  calibratedRatings: CalibratedRatings;
  employees: CalibratorEmployee[];
  getBadgeColor: (index: number) => string;
  onOpenOverride: (employeeId: number) => void;
  onRatingChange: (employeeId: number, rating: Rating) => void;
  ratingColorIndex: Record<Rating | "Unsatisfactory", number>;
  ratingOptions: RatingOption[];
  ratingTextColor: Record<Rating, string>;
};

const EmployeeCalibrationTable = ({
  calibratedRatings,
  employees,
  getBadgeColor,
  onOpenOverride,
  onRatingChange,
  ratingColorIndex,
  ratingOptions,
  ratingTextColor,
}: EmployeeCalibrationTableProps) => {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-slate-500/10 text-xs font-bold uppercase tracking-wider text-text-body2">
            <tr>
              <th rowSpan={2} className="w-[230px] border-b border-r border-border px-4 py-4">
                Employee
              </th>
              <th rowSpan={2} className="w-[130px] border-b border-r border-border px-4 py-4">
                Manager
              </th>
              <th colSpan={3} className="border-b border-r border-border bg-slate-500/20 px-4 py-3">
                Prior cycles (culture amp pattern · up to 3)
              </th>
              <th rowSpan={2} className="w-[120px] border-b border-r border-border px-4 py-4">
                FY26 Self
              </th>
              <th rowSpan={2} className="w-[170px] border-b border-r border-border px-4 py-4">
                FY26 Manager Suggested
              </th>
              <th rowSpan={2} className="w-[630px] border-b border-x border-primary/30 bg-primary/10 px-4 py-4 text-primary">
                FY26 Calibrated
              </th>
              <th rowSpan={2} className="w-[90px] border-b border-r border-border px-3 py-4">
                9-Box
              </th>
              <th rowSpan={2} className="w-[220px] border-b border-border px-4 py-4">
                Flag
              </th>
            </tr>
            <tr>
              {["FY23", "FY24", "FY25"].map((year) => (
                <th key={year} className="w-[120px] border-b border-r border-border bg-slate-500/20 px-4 py-3">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card">
            {employees.map((employee) => {
              const selectedRating =
                ratingOptions.find((option) => option.value === calibratedRatings[employee.id]) ??
                ratingOptions[0];

              return (
                <tr key={employee.id} className="border-b border-border last:border-b-0 hover:bg-slate-500/5">
                  <td className="border-r border-border px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                        {employee.initials}
                      </span>
                      <div className="min-w-0">
                        <button
                          className="block max-w-full truncate text-left text-sm font-bold text-text-title hover:text-primary cursor-pointer"
                          onClick={() => onOpenOverride(employee.id)}
                        >
                          {employee.name}
                        </button>
                        <div className="truncate text-xs font-medium text-text-body2">
                          {employee.detail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-r border-border px-4 py-4 text-sm font-semibold text-text-title">
                    {employee.manager}
                  </td>
                  {employee.prior.map((rating, index) => (
                    <td key={`${employee.id}-${index}`} className="border-r border-border bg-slate-500/10 px-4 py-4">
                      {rating ? (
                        <Badge
                          label={rating === "Unsatisfactory" ? "Unsati" : rating}
                          backgroundColor={getBadgeColor(ratingColorIndex[rating])}
                          textColor=""
                          size="sm"
                        />
                      ) : (
                        <span className="text-sm font-medium text-text-body2">-</span>
                      )}
                    </td>
                  ))}
                  <td className="border-r border-border px-4 py-4">
                    <Badge
                      label={employee.self}
                      backgroundColor={getBadgeColor(ratingColorIndex[employee.self])}
                      textColor=""
                      size="sm"
                    />
                  </td>
                  <td className="border-r border-border px-4 py-4">
                    <Badge
                      label={employee.managerSuggested}
                      backgroundColor={getBadgeColor(ratingColorIndex[employee.managerSuggested])}
                      textColor=""
                      size="sm"
                    />
                  </td>
                  <td
                    className={`border-x border-primary/30 bg-primary/10 px-3 py-4 ${
                      employee.override ? "bg-amber-500/10" : ""
                    }`}
                  >
                    <Select
                      options={ratingOptions}
                      value={selectedRating}
                      onChange={(option) => {
                        onRatingChange(employee.id, option.value);
                        onOpenOverride(employee.id);
                      }}
                      className={`relative w-[200px] [&>button]:min-h-[34px] [&>button]:rounded-md [&>button]:border-border [&>button]:bg-card [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-xs [&>button]:font-bold [&>button]:shadow-sm [&>button_span]:font-bold [&>div]:mt-1 [&>div]:w-[130px] [&>div]:rounded-md [&>div]:border-border [&>div]:bg-card [&>div]:p-0 [&_li]:rounded-none [&_li]:px-3 [&_li]:py-1.5 [&_li]:text-text-title hover:[&_li]:bg-slate-500/20 [&_li.bg-primary-50]:bg-primary/20 [&_li.bg-primary-50]:text-primary ${ratingTextColor[selectedRating.value]}`}
                    />
                    {employee.override && (
                      <span className="mt-1 block text-[10px] font-bold uppercase text-amber-500">
                        + Override
                      </span>
                    )}
                  </td>
                  <td className="border-r border-border px-3 py-3">
                    <div className="grid h-[52px] w-[52px] grid-cols-3 gap-0.5">
                      {Array.from({ length: 9 }).map((_, index) => {
                        const row = Math.floor(index / 3);
                        const col = index % 3;
                        const active = col === employee.nineBox[0] && row === employee.nineBox[1];

                        return (
                          <span
                            key={index}
                            className={`rounded-[3px] ${
                              active ? "bg-primary ring-2 ring-card" : "bg-slate-500/30"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {employee.flag && (
                      <Badge
                        label={employee.flag.label}
                        backgroundColor={getBadgeColor(employee.flag.tone === "green" ? 2 : 4)}
                        textColor=""
                        size="sm"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EmployeeCalibrationTable;
