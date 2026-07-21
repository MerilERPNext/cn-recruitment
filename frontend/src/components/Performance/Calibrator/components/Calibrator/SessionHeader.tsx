import { Grid3X3, Pause, Send } from "lucide-react";
import Badge from "../../../../shared/Badge";
import { Typography } from "../../../../shared/atoms/Typography";

type SessionHeaderProps = {
  getBadgeColor: (index: number) => string;
  onOpenBoxGrid: () => void;
};

const SessionHeader = ({ getBadgeColor, onOpenBoxGrid }: SessionHeaderProps) => {
  return (
    <section className="shrink-0 rounded-md border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
            <Badge
              label="Session Live"
              backgroundColor={getBadgeColor(2)}
              textColor=""
              size="sm"
            />
            <span>FY26 · India Tech · L1-L5 · 12 of 142 calibrated</span>
          </div>
          <Typography variant="h1" className="text-lg font-bold leading-tight text-gray-900 sm:text-xl">
            Calibration · India Tech · 5 Jun 2026
          </Typography>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
          <div className="flex items-center sm:col-span-2 xl:col-span-1">
            {["AS", "RK", "SR", "NP"].map((initials, index) => (
              <span
                key={initials}
                className="-ml-1 first:ml-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[11px] font-bold text-blue-600"
                style={{ zIndex: 10 - index }}
              >
                {initials}
              </span>
            ))}
            <span className="ml-3 text-sm font-medium text-gray-600">+ 2 calibrators in session</span>
          </div>
          <button
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-4 text-sm font-bold text-blue-600 shadow-sm"
            onClick={onOpenBoxGrid}
          >
            <Grid3X3 className="h-4 w-4" />
            Open 9-Box view
          </button>
          <button className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm">
            <Pause className="h-4 w-4" />
            Pause Session
          </button>
          <button className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm sm:col-span-2 xl:col-span-1">
            <Send className="h-4 w-4" />
            Submit & Publish ratings
          </button>
        </div>
      </div>
    </section>
  );
};

export default SessionHeader;
