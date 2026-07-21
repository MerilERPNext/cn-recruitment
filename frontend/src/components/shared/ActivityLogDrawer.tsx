import React from "react";
import { CheckCircle2 } from "lucide-react";
import SideDrawer from "./SideDrawer";
import NoDataFound from "./atoms/NoDataFound";
import type { FunnelActivityLogEntry } from "../../types/flows";
import { useGetFunnelActivityLog } from "../../hooks/useFlows";
import { Typography } from "./atoms/Typography";

interface ActivityLogDrawerProps {
  open: boolean;
  onClose: () => void;
  funnelActivityId: string;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "xxl" | "full";
}

const formatLogTimestamp = (value: string): { date: string; time: string } => {
  // API returns MySQL datetime with microseconds, ex: "2026-04-23 18:30:36.815713"
  if (!value) return { date: "", time: "" };

  try {
    const normalized = value.replace(" ", "T");
    const [base, fractional] = normalized.split(".");
    
    // Check if the input specifies a timezone (ends with Z or has +/- offset)
    const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(value);

    let d: Date;
    if (hasTimezone) {
      let safeIso = normalized;
      if (fractional) {
        const tzMatch = fractional.match(/Z|[+-].*$/);
        const tzSuffix = tzMatch ? tzMatch[0] : "";
        const numericFraction = tzMatch ? fractional.slice(0, tzMatch.index) : fractional;
        safeIso = `${base}.${numericFraction.slice(0, 3)}${tzSuffix}`;
      }
      d = new Date(safeIso);
    } else {
      const safeIso = fractional
        ? `${base}.${fractional.slice(0, 3)}Z`
        : `${base}Z`;
      d = new Date(safeIso);
    }

    if (Number.isNaN(d.getTime())) return { date: "", time: "" };

    if (hasTimezone) {
      const dateParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).formatToParts(d);

      const day = dateParts.find((p) => p.type === "day")?.value ?? "";
      const month = dateParts.find((p) => p.type === "month")?.value ?? "";
      const year = dateParts.find((p) => p.type === "year")?.value ?? "";
      const date = day && month && year ? `${day}-${month}-${year}` : "";

      const time = d.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return { date, time };
    } else {
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = d.getUTCFullYear();
      const date = `${day}-${month}-${year}`;

      let hours = d.getUTCHours();
      const minutes = String(d.getUTCMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, "0");
      const time = `${formattedHours}:${minutes} ${ampm}`;

      return { date, time };
    }
  } catch (error) {
    console.error("Error formatting log timestamp:", error);
    return { date: "", time: "" };
  }
};

const ActivityTimelineItem: React.FC<{
  entry: FunnelActivityLogEntry;
  isLast: boolean;
}> = ({ entry, isLast }) => {
  const { date, time } = formatLogTimestamp(entry.timestamp);

  return (
    <div className="flex items-stretch gap-3">
      {/* Date / time column */}
      <div className="w-[84px] shrink-0 text-right pt-1">
        <Typography
          variant="caption"
          color="body1"
          component="div"
          noWrap
          className="leading-4 font-semibold whitespace-nowrap block"
        >
          {date}
        </Typography>
        <Typography
          variant="caption"
          color="body2"
          component="div"
          noWrap
          className="leading-4 whitespace-nowrap block"
        >
          {time}
        </Typography>
      </div>

      {/* Timeline rail + icon */}
      <div className="relative w-6 shrink-0 flex justify-center self-stretch">
        {!isLast && <div className="absolute top-0 bottom-0 w-px bg-gray-200" />}
        <div className="relative mt-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-gray-500" />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 pb-6">
        <Typography
          variant="bodyMedium"
          color="title"
          className="mt-1 leading-snug"
        >
          {entry.title}
        </Typography>

        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold bg-primary-50 text-primary-700 border border-primary-200/60 px-2 py-0.5 rounded-lg">
            {entry.category}
          </span>
        </div>

        {entry.details?.length > 0 && (
          <div className="mt-2 space-y-1">
            {entry.details
              .filter((d) => (d.value ?? "").trim().length > 0)
              .map((d, idx) => (
                <Typography
                  key={`${d.label}-${idx}`}
                  variant="bodySmall"
                  color="body2"
                  className="leading-5"
                >
                  <span className="font-semibold text-text-body1">
                    {d.label}:
                  </span>{" "}
                  <span className="text-text-body2">{d.value}</span>
                </Typography>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityLogSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
      <div className="relative space-y-0 animate-pulse">
        {Array.from({ length: rows }).map((_, idx) => {
          const isLast = idx === rows - 1;

          return (
            <div key={`activity-log-skeleton-${idx}`} className="flex items-stretch gap-3">
              {/* Date / time column */}
              <div className="w-[84px] shrink-0 text-right pt-1 space-y-2">
                <div className="h-3 w-16 bg-gray-200 rounded ml-auto" />
                <div className="h-3 w-12 bg-gray-200 rounded ml-auto" />
              </div>

              {/* Timeline rail + icon */}
              <div className="relative w-6 shrink-0 flex justify-center self-stretch">
                {!isLast && (
                  <div className="absolute top-0 bottom-0 w-px bg-gray-200" />
                )}
                <div className="relative mt-0.5 w-5 h-5 rounded-full bg-gray-200" />
              </div>

              {/* Content */}
              <div className="min-w-0 pb-6 flex-1">
                <div className="mt-1 h-4 w-3/5 bg-gray-200 rounded" />
                <div className="mt-2 h-5 w-24 bg-primary-100/60 border border-primary-200/50 rounded-lg" />

                <div className="mt-3 space-y-2">
                  <div className="h-3 w-4/5 bg-gray-200 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({
  open,
  onClose,
  funnelActivityId,
  title = "Activity Log",
  size = "xxl",
}) => {
  const { data, isLoading, isFetching, error } = useGetFunnelActivityLog(
    funnelActivityId,
    open,
  );

  if (!open) return null;

  const payload = data?.data;
  const entries = payload?.entries ?? [];

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      side="right"
      size={size}
      title={title}
      className="p-0"
    >
      <div className="flex flex-col min-h-0 h-full">
        {(isLoading || isFetching) && entries.length === 0 ? (
          <ActivityLogSkeleton />
        ) : error ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <NoDataFound subtitle="Failed to load activity log" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <NoDataFound subtitle="No activity found" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            <div className="relative">
              {entries.map((entry, idx) => {
                const isLast = idx === entries.length - 1;
                return (
                  <ActivityTimelineItem
                    key={`${entry.timestamp}-${idx}`}
                    entry={entry}
                    isLast={isLast}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SideDrawer>
  );
};

export default ActivityLogDrawer;

