import { Typography } from "../../../shared/atoms/Typography";

const PerformanceReviewHeader = () => {
  return (
    <div className="relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-xl bg-blue-500 p-4 text-white shadow-sm sm:rounded-2xl sm:p-6 md:flex-row md:gap-6 md:p-8">
      <div className="z-10 flex w-full min-w-0 flex-col">
        <div className="mb-4 w-fit max-w-full rounded-md bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-50 sm:text-xs">
          FINAL RATING · RELEASED 8 JUN 2026
        </div>
        <Typography
          variant="h1"
          className="mb-2 text-2xl font-bold leading-tight text-white sm:text-3xl"
        >
          FY26 Annual Performance Review
        </Typography>
        <Typography
          variant="bodyMedium"
          className="text-sm font-medium leading-relaxed text-blue-100 sm:text-base"
        >
          Pallavi Mahar · Sr. Product Designer · Oxygen
        </Typography>
      </div>

      <div className="z-10 flex w-full flex-col items-center justify-center rounded-xl border border-white/20 bg-white/20 p-4 sm:p-6 md:w-auto md:min-w-[200px]">
        <Typography
          variant="caption"
          className="mb-1 text-xs font-bold uppercase tracking-widest text-white"
        >
          OVERALL RATING
        </Typography>
        <Typography
          variant="h1"
          className="mb-2 text-3xl font-bold text-white sm:text-4xl"
        >
          Exceeds
        </Typography>
        <Typography
          variant="bodyMedium"
          className="text-sm font-medium text-blue-100"
        >
          4 / 5
        </Typography>
      </div>

      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-md bg-white/5 blur-3xl" />
      <div className="absolute -top-24 right-32 h-64 w-64 rounded-md bg-white/5 blur-3xl" />
    </div>
  );
};

export default PerformanceReviewHeader;

