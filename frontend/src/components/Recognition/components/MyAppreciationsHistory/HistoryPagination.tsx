import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";

type HistoryPaginationProps = {
  totalRecords: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
};

// Build a compact page-number window around the current page.
const buildPages = (current: number, total: number): (number | "…")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) pages.push("…");
  for (let p = from; p <= to; p++) pages.push(p);
  if (to < total - 1) pages.push("…");
  pages.push(total);
  return pages;
};

const HistoryPagination = ({
  totalRecords,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: HistoryPaginationProps) => {
  const [sizeOpen, setSizeOpen] = useState(false);
  const sizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sizeOpen) return;
    const handler = (e: MouseEvent) => {
      if (sizeRef.current && !sizeRef.current.contains(e.target as Node))
        setSizeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sizeOpen]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const current = Math.min(page, totalPages);
  const startRow = totalRecords === 0 ? 0 : (current - 1) * pageSize + 1;
  const endRow = Math.min(current * pageSize, totalRecords);

  return (
    <div className="mt-4 flex flex-col gap-3 text-gray-600 sm:flex-row sm:items-center sm:justify-between">
      <Typography variant="bodySmall" className="font-medium">
        {totalRecords > 0
          ? `${startRow} - ${endRow} of ${totalRecords} Records`
          : "0 Records"}
      </Typography>

      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {buildPages(current, totalPages).map((p, i) =>
            p === "…" ? (
              <span
                key={`gap-${i}`}
                className="flex h-8 w-8 items-center justify-center text-sm text-gray-400"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-md px-3 text-sm font-semibold transition ${
                  p === current
                    ? "bg-gray-100 text-gray-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            disabled={current >= totalPages}
            onClick={() => onPageChange(current + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="relative" ref={sizeRef}>
          <button
            type="button"
            onClick={() => setSizeOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            {pageSize}
            <ChevronDown className="h-4 w-4" />
            <span className="text-xs text-gray-500">per page</span>
          </button>
          {sizeOpen && (
            <div className="absolute bottom-full right-0 z-20 mb-1 w-24 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {pageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(opt);
                    setSizeOpen(false);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-sm transition hover:bg-gray-50 ${
                    opt === pageSize
                      ? "font-semibold text-primary"
                      : "text-gray-700"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPagination;
