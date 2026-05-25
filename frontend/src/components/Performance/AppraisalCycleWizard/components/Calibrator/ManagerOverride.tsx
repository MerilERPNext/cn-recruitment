import { AlertTriangle, ArrowRight, X } from "lucide-react";
import Badge from "../../../../shared/Badge";
import { Typography } from "../../../../shared/atoms/Typography";

type ManagerOverrideProps = {
  onClose: () => void;
  open: boolean;
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

const ManagerOverride = ({ onClose, open }: ManagerOverrideProps) => {
  const ratingOptions = [
    { label: "Unsatisfactory", value: "1 / 5" },
    { label: "Below", value: "2 / 5" },
    { label: "Meets", value: "3 / 5", active: true },
    { label: "Exceeds", value: "4 / 5" },
    { label: "Outstanding", value: "5 / 5" },
  ];

  const comparisonData = [
    { label: "FY24", rating: "Meets", colorIndex: 0 },
    { label: "FY25", rating: "Below", colorIndex: 4 },
    { label: "Peer avg (4)", rating: "Meets", colorIndex: 0 },
    { label: "Skip view", rating: "Meets", colorIndex: 0 },
  ];

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed  inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-4 font-sans text-gray-900 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <section
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1100px] flex-col overflow-hidden rounded-md bg-white shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 px-6 pt-4">
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
                VR
              </span>
              <Badge
                label="Vikram Rao"
                backgroundColor={generatePastelColor(0)}
                textColor=""
                size="sm"
              />
              <span>Designer II · LMS · 2.4y at PW</span>
            </div>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto">
        <div className="grid gap-4 px-6 py-3 md:grid-cols-[1fr_1fr]">
          <section className="rounded-md border border-gray-200 bg-white p-3">
            <Typography
              variant="caption"
              className="block font-bold uppercase tracking-wider text-gray-500"
            >
              Manager (Rohit Khanna) said
            </Typography>
            <div className="mt-2">
              <Badge
                label="Below · 2/5"
                backgroundColor={generatePastelColor(4)}
                textColor=""
                size="sm"
              />
            </div>
            <p className="mt-3 text-xs italic leading-relaxed text-gray-600">
              "Vikram's output dropped this cycle; only 30% of goals on track; LMS migration
              delayed."
            </p>
          </section>

          <section className="rounded-md border border-blue-400 bg-blue-50 p-3">
            <Typography
              variant="caption"
              className="block font-bold uppercase tracking-wider text-blue-600"
            >
              Your override → Meets (3)
            </Typography>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ratingOptions.map((rating) => (
                <button
                  key={rating.label}
                  className={`min-h-[46px] rounded-md border px-2 py-1.5 text-center text-xs font-semibold transition-colors ${
                    rating.active
                      ? "border-blue-500 bg-blue-100 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                  }`}
                >
                  <span className="block truncate">{rating.label}</span>
                  <span className="mt-0.5 block text-[10px] text-gray-500">{rating.value}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="mx-6 rounded-md bg-[#f3f7ff] p-3">
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
                <Badge
                  label={item.rating}
                  backgroundColor={generatePastelColor(item.colorIndex)}
                  textColor=""
                  size="sm"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-2.5 px-6 py-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Reason for override <span className="text-red-500">*</span>
            </label>
            <select className="min-h-[38px] w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              <option>Significant external factors not reflected in manager rating</option>
              <option>Peer feedback materially changes rating</option>
              <option>Calibration distribution correction</option>
            </select>
          </div>

          <textarea
            rows={3}
            className="min-h-[72px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            defaultValue="Manager rating skews low compared to skip + peer view. LMS migration delays were largely due to external dependency on procurement (CI) Adhaar contract. Vikram's individual contribution to platform stability was strong - 3 P1s averted. Recommend Meets with a clear Q1 FY27 goal-reset."
          />

          <section className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
              <div>
                <Typography variant="bodyMedium" className="text-sm font-bold text-yellow-800">
                  This override will:
                </Typography>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-yellow-900">
                  <li>Notify Rohit Khanna, manager, before release</li>
                  <li>Move Vikram from 9-Box inconsistent → effective</li>
                  <li>Shift India Tech distribution: Below 14% → 13%, Meets 53% → 54%</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-200 bg-[#f3f7ff] px-6 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="min-h-[38px] rounded-md border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-600">
            Save Override
            <ArrowRight className="h-4 w-4" />
          </button>
        </footer>
      </section>
    </div>
  );
};

export default ManagerOverride;
