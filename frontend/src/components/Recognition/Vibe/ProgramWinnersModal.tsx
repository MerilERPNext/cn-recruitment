import React from "react";
import { Trophy, X } from "lucide-react";
import { Typography } from "../../shared/atoms/Typography";
import Avatar from "./Avatar";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { useProgramWinners } from "../../../services/recognitionService";

/* eslint-disable @typescript-eslint/no-explicit-any */
const API_HOST =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_DOMAIN ||
  (typeof window !== "undefined" ? window.location.origin : "");
/* eslint-enable @typescript-eslint/no-explicit-any */

const resolvePhoto = (image?: string | null): string | undefined => {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${API_HOST}${image}`;
  return image;
};

const initialsOf = (name?: string | null): string =>
  (name || "")
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Full winner list for a single Recognition Program, opened from the "View All"
 * link on an All Awards card. The card itself only has room for the first few.
 */
const ProgramWinnersModal: React.FC<{
  open: boolean;
  program: string;
  title: string;
  onClose: () => void;
}> = ({ open, program, title, onClose }) => {
  // Only fetch while the modal is actually open.
  const { data, isLoading, isError } = useProgramWinners(program, open);

  if (!open) return null;

  const winners = data?.winners ?? [];

  return (
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 shrink-0 text-amber-400" />
              <h2 className="truncate text-base font-bold text-gray-900">{title}</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {isLoading
                ? "Loading winners…"
                : `${data?.total_count ?? 0} winner${
                    (data?.total_count ?? 0) === 1 ? "" : "s"
                  }`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-gray-400 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="py-14 text-center text-sm text-gray-400">Loading winners…</p>
          ) : isError ? (
            <p className="py-14 text-center text-sm text-red-500">
              Failed to load winners.
            </p>
          ) : winners.length === 0 ? (
            <p className="py-14 text-center text-sm text-gray-400">
              No winners yet for this program.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {winners.map((w) => (
                <li
                  key={w.employee}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50/70 sm:gap-4"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-semibold text-amber-700">
                    {w.rank}
                  </span>
                  <Avatar
                    name={w.employee_name || w.employee}
                    initials={initialsOf(w.employee_name || w.employee)}
                    photo={resolvePhoto(w.image)}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <WrapperHoverCard employeeId={w.employee}>
                      <Typography
                        variant="bodyMedium"
                        className="cursor-pointer truncate font-semibold"
                      >
                        {w.employee_name || w.employee}
                      </Typography>
                    </WrapperHoverCard>
                    <Typography
                      variant="bodySmall"
                      color="body2"
                      className="block truncate"
                    >
                      {w.department || "—"}
                    </Typography>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <Typography variant="bodySmall" className="font-semibold text-gray-700">
                      {w.recognitions}
                    </Typography>
                    <Typography variant="caption" color="body2" className="block">
                      {w.recognitions === 1 ? "recognition" : "recognitions"}
                    </Typography>
                  </div>

                  <div className="shrink-0 text-right">
                    <Typography variant="bodySmall" className="font-semibold text-amber-600">
                      {w.points} pts
                    </Typography>
                    <Typography variant="caption" color="body2" className="block">
                      {w.award_date || "—"}
                    </Typography>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramWinnersModal;
