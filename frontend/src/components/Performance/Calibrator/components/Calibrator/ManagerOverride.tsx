import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import Badge from "../../../../shared/Badge";
import { Typography } from "../../../../shared/atoms/Typography";
import type { CalibratorEmployee, Rating } from "../../types";

type OverrideEmployee = Pick<
  CalibratorEmployee,
  "detail" | "initials" | "manager" | "managerSuggested" | "name" | "prior"
>;

type ManagerOverrideProps = {
  employee: OverrideEmployee | null;
  onClose: () => void;
  onRatingChange: (rating: Rating) => void;
  onSaveOverride: () => void;
  open: boolean;
  rating: Rating;
};

const generatePastelColor = (index: number) => {
  const colors = [
    "bg-primary/20 text-primary border-primary/30",
    "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "bg-amber-500/20 text-amber-500 border-amber-500/30",
    "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "bg-red-500/20 text-red-500 border-red-500/30",
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
  onSaveOverride,
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
      className="fixed inset-0 z-[9999] flex items-stretch justify-center overflow-hidden bg-black/60 backdrop-blur-xs p-0 font-sans text-text-title animate-in fade-in duration-200 lg:items-center lg:p-4"
      onClick={onClose}
    >
      <section
        className="flex h-dvh w-full max-w-[1100px] flex-col overflow-hidden bg-card border border-border shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200 lg:h-auto lg:max-h-[calc(100dvh-2rem)] lg:rounded-md"
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
            <Typography variant="h2" className="mt-1.5 text-lg font-bold leading-tight text-text-title">
              Override Manager Rating
            </Typography>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-text-body2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-text-body2 hover:text-text-title cursor-pointer"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <div className="grid gap-3 px-4 py-3 sm:gap-4 sm:px-6 md:grid-cols-[1fr_1fr]">
          <section className="rounded-md border border-border bg-card p-3">
            <Typography
              variant="caption"
              color="body2"
              className="block font-bold uppercase tracking-wider"
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
              className="mt-3 min-h-[86px] w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-xs italic leading-relaxed text-text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </section>

          <section className="rounded-md border border-primary/30 bg-primary/10 p-3">
            <Typography
              variant="caption"
              className="block font-bold uppercase tracking-wider text-primary"
            >
              Your override → {rating} ({ratingScore[rating].split(" / ")[0]})
            </Typography>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ratingOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => onRatingChange(option)}
                  className={`min-h-[46px] min-w-0 rounded-md border px-2 py-1.5 text-center text-xs font-semibold transition-colors cursor-pointer ${
                    option === rating
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-card text-text-title hover:border-primary/50"
                  }`}
                >
                  <span className="block truncate">{option}</span>
                  <span className="mt-0.5 block text-[10px] text-text-body2">
                    {ratingScore[option]}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="mx-4 rounded-md bg-slate-500/10 border border-border p-3 sm:mx-6">
          <Typography
            variant="caption"
            color="body2"
            className="block font-bold uppercase tracking-wider"
          >
            Comparison data
          </Typography>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {comparisonData.map((item) => (
              <div key={item.label} className="min-w-0">
                <div className="mb-1 text-[11px] font-semibold text-text-body2">{item.label}</div>
                {item.rating ? (
                  <Badge
                    label={item.rating}
                    backgroundColor={generatePastelColor(ratingColorIndex[item.rating])}
                    textColor=""
                    size="sm"
                  />
                ) : (
                  <span className="text-sm font-medium text-text-body2">-</span>
                )}
              </div>
            ))}
            <div className="min-w-0">
              <div className="mb-1 text-[11px] font-semibold text-text-body2">Manager</div>
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
            <label className="mb-1.5 block text-xs font-semibold text-text-title">
              Reason for override <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-[38px] w-full rounded-md border border-border bg-card px-3 text-sm text-text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option>Significant external factors not reflected in manager rating</option>
              <option>Peer feedback materially changes rating</option>
              <option>Calibration distribution correction</option>
            </select>
          </div>

          <textarea
            rows={3}
            className="min-h-[72px] w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm leading-relaxed text-text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <section className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <Typography variant="bodyMedium" className="text-sm font-bold text-amber-500">
                  This override will:
                </Typography>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-amber-400">
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

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-border bg-slate-500/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-2.5">
          <button
            className="min-h-[42px] w-full rounded-md border border-border bg-card px-4 text-sm font-semibold text-text-title shadow-sm hover:bg-slate-500/10 cursor-pointer sm:min-h-[38px] sm:w-auto"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white shadow-sm hover:bg-primary/90 cursor-pointer sm:min-h-[38px] sm:w-auto"
            onClick={onSaveOverride}
          >
            Save Override
            <ArrowRight className="h-4 w-4" />
          </button>
        </footer>
      </section>
    </div>
  );
};

export default ManagerOverride;
