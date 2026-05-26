import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import Badge from "../../../../shared/Badge";
import { Typography } from "../../../../shared/atoms/Typography";

type Rating = "Outstanding" | "Exceeds" | "Meets" | "Below";
type PriorCycle = Rating | "Unsatisfactory" | "";

type OverrideEmployee = {
  detail: string;
  initials: string;
  manager: string;
  managerSuggested: Rating;
  name: string;
  prior: [PriorCycle, PriorCycle, PriorCycle];
};

type ManagerOverrideProps = {
  employee: OverrideEmployee | null;
  onClose: () => void;
  onRatingChange: (rating: Rating) => void;
  open: boolean;
  rating: Rating;
};

const generatePastelColor = (index: number) => {
  const colors = [
    "bg-blue-100 text-blue-700 ring-blue-300",
    "bg-purple-100 text-purple-700 ring-purple-300",
    "bg-green-100 text-green-700 ring-green-300",
    "bg-pink-100 text-pink-700 ring-pink-300",
    "bg-yellow-100 text-yellow-700 ring-yellow-300",
    "bg-orange-100 text-orange-700 ring-orange-300",
    "bg-cyan-100 text-cyan-700 ring-cyan-300",
    "bg-red-100 text-red-700 ring-red-300",
  ];
  return colors[index % colors.length];
};

const ratingScore: Record<Rating | "Unsatisfactory", string> = {
  Unsatisfactory: "1 / 5",
  Below: "2 / 5",
  Meets: "3 / 5",
  Exceeds: "4 / 5",
  Outstanding: "5 / 5",
};

const ratingColorIndex: Record<Rating | "Unsatisfactory", number> = {
  Unsatisfactory: 0,
  Below: 4,
  Meets: 0,
  Exceeds: 2,
  Outstanding: 6,
};

const ManagerOverride = ({
  employee,
  onClose,
  onRatingChange,
  open,
  rating,
}: ManagerOverrideProps) => {
  const [reason, setReason] = useState(
    "Significant external factors not reflected in manager rating",
  );
  const [notes, setNotes] = useState(
    "Manager rating skews low compared to skip + peer view. Add calibration context, external blockers, peer feedback, and next-cycle commitments before saving.",
  );
  const [managerComment, setManagerComment] = useState(
    "Rating rationale from manager. Update this note with goal progress, blockers, and observed impact.",
  );

  const ratingOptions: Rating[] = [
    "Below",
    "Meets",
    "Exceeds",
    "Outstanding",
  ];

  const comparisonData =
    employee?.prior.map((priorRating, index) => ({
      label: `FY${23 + index}`,
      rating: priorRating,
    })) ?? [];

  if (!open || !employee) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-stretch justify-center overflow-hidden bg-black/35 p-0 font-sans text-gray-900 animate-in fade-in duration-200 lg:items-center lg:p-4"
      onClick={onClose}
    >
      <section
        className="flex h-dvh w-full max-w-[1100px] flex-col overflow-hidden bg-white shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200 lg:h-auto lg:max-h-[calc(100dvh-2rem)] lg:rounded-md"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 sm:gap-4 sm:px-6">
          <div className="min-w-0">
            <Badge
              label="Override · requires reason"
              backgroundColor={generatePastelColor(5)}
              textColor=""
              size="sm"
            />
            <Typography variant="h2" className="mt-1.5 text-lg font-bold leading-tight text-gray-900">
              Override Manager Rating
            </Typography>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">
                {employee.initials}
              </span>
              <Badge
                label={employee.name}
                backgroundColor={generatePastelColor(0)}
                textColor=""
                size="sm"
              />
              <span>{employee.detail}</span>
            </div>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <div className="grid gap-3 px-4 py-3 sm:gap-4 sm:px-6 md:grid-cols-[1fr_1fr]">
          <section className="rounded-md border border-gray-200 bg-white p-3">
            <Typography
              variant="caption"
              className="block font-bold uppercase tracking-wider text-gray-500"
            >
              Manager ({employee.manager}) said
            </Typography>
            <div className="mt-2">
              <Badge
                label={`${employee.managerSuggested} · ${ratingScore[employee.managerSuggested]}`}
                backgroundColor={generatePastelColor(ratingColorIndex[employee.managerSuggested])}
                textColor=""
                size="sm"
              />
            </div>
            <textarea
              rows={4}
              value={managerComment}
              onChange={(event) => setManagerComment(event.target.value)}
              className="mt-3 min-h-[86px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-xs italic leading-relaxed text-gray-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          <section className="rounded-md border border-blue-400 bg-blue-50 p-3">
            <Typography
              variant="caption"
              className="block font-bold uppercase tracking-wider text-blue-600"
            >
              Your override → {rating} ({ratingScore[rating].split(" / ")[0]})
            </Typography>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ratingOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => onRatingChange(option)}
                  className={`min-h-[46px] min-w-0 rounded-md border px-2 py-1.5 text-center text-xs font-semibold transition-colors ${
                    option === rating
                      ? "border-blue-500 bg-blue-100 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                  }`}
                >
                  <span className="block truncate">{option}</span>
                  <span className="mt-0.5 block text-[10px] text-gray-500">
                    {ratingScore[option]}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="mx-4 rounded-md bg-[#f3f7ff] p-3 sm:mx-6">
          <Typography
            variant="caption"
            className="block font-bold uppercase tracking-wider text-gray-500"
          >
            Comparison data
          </Typography>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {comparisonData.map((item) => (
              <div key={item.label} className="min-w-0">
                <div className="mb-1 text-[11px] font-semibold text-gray-500">{item.label}</div>
                {item.rating ? (
                  <Badge
                    label={item.rating}
                    backgroundColor={generatePastelColor(ratingColorIndex[item.rating])}
                    textColor=""
                    size="sm"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-400">-</span>
                )}
              </div>
            ))}
            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-semibold text-gray-500">Manager</div>
              <Badge
                label={employee.managerSuggested}
                backgroundColor={generatePastelColor(ratingColorIndex[employee.managerSuggested])}
                textColor=""
                size="sm"
              />
            </div>
          </div>
        </section>

        <div className="space-y-2.5 px-4 py-3 sm:px-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Reason for override <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[38px] w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option>Significant external factors not reflected in manager rating</option>
              <option>Peer feedback materially changes rating</option>
              <option>Calibration distribution correction</option>
            </select>
          </div>

          <textarea
            rows={3}
            className="min-h-[72px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <section className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
              <div>
                <Typography variant="bodyMedium" className="text-sm font-bold text-yellow-800">
                  This override will:
                </Typography>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-yellow-900">
                  <li>Notify {employee.manager}, manager, before release</li>
                  <li>
                    Move {employee.name} from {employee.managerSuggested} to {rating}
                  </li>
                  <li>Save reason: {reason}</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-200 bg-[#f3f7ff] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-2.5">
          <button
            className="min-h-[42px] w-full rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm sm:min-h-[38px] sm:w-auto"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-600 sm:min-h-[38px] sm:w-auto">
            Save Override
            <ArrowRight className="h-4 w-4" />
          </button>
        </footer>
      </section>
    </div>
  );
};

export default ManagerOverride;
