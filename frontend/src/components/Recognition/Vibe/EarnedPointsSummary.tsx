import React from "react";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { REDEMPTION_HISTORY } from "./vibeMockData";

const TABLE_TITLES = [
  "Date of Redemption",
  "Order ID",
  "Transaction ID",
  "Redeemed Points",
  "Source",
  "Comments",
];

const TABLE_WIDTHS = [
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
  "1fr",
];

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="px-2">
    <Typography variant="h2" className="text-2xl font-bold text-blue-600">
      {value}
    </Typography>
    <Typography variant="bodySmall" color="body2">
      {label}
    </Typography>
  </div>
);

const EarnedPointsSummary: React.FC = () => {
  return (
    <div className="p-4 md:p-6">
      <Typography variant="h2" className="mb-5 text-2xl font-bold">
        Earned Points Summary
      </Typography>

      {/* Summary bar */}
      <Card radius="xl" className="border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col md:flex-row items-stretch gap-4">
          <div className="flex flex-1 items-center justify-between gap-4">
            <Stat value="7.5K" label="Total Earned" />
            <div className="h-12 w-px bg-gray-100" />
            <Stat value="40" label="From Appreciation Programs" />
            <div className="h-12 w-px bg-gray-100" />
            <Stat value="7.5K" label="From Award Programs" />
          </div>

          <div className="flex flex-1 items-center justify-around rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5 text-white">
            <div className="text-center">
              <Typography variant="h2" className="text-2xl font-bold text-white">
                7.5K
              </Typography>
              <Typography variant="bodySmall" className="text-blue-50">
                Redeemed
              </Typography>
            </div>
            <div className="h-12 w-px bg-white/30" />
            <div className="text-center">
              <Typography variant="h2" className="text-2xl font-bold text-white">
                0
              </Typography>
              <Typography variant="bodySmall" className="text-blue-50">
                Available Points
              </Typography>
            </div>
          </div>
        </div>
      </Card>

      {/* Redemption history */}
      <Typography variant="h4" className="mb-3 font-bold">
        Point Redemption History
      </Typography>

      <Card radius="xl" className="border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              placeholder="Search"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
              <SlidersHorizontal className="size-4" />
            </button>
            <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
              <Upload className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden border-y border-gray-100">
          <CardTable
            titles={TABLE_TITLES}
            columnWidths={TABLE_WIDTHS}
            noBorder
            noShadow
            noRound
          >
            <div className="min-w-[900px]">
              {REDEMPTION_HISTORY.map((row, i) => (
                <div
                  key={`${row.orderId}-${i}`}
                  className="grid min-h-[64px] items-center gap-4 border-b border-gray-100 px-6 py-4 transition-colors hover:bg-gray-50/70"
                  style={{ gridTemplateColumns: TABLE_WIDTHS.join(" ") }}
                >
                  <Typography
                    variant="bodySmall"
                    className="text-center font-semibold text-gray-700"
                  >
                    {row.date}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="truncate text-center font-semibold text-gray-700"
                  >
                    {row.orderId}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="truncate text-center font-semibold text-gray-700"
                  >
                    {row.transactionId}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="text-center font-bold text-red-500"
                  >
                    {row.points}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="truncate text-center font-semibold text-gray-700"
                  >
                    {row.source}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="truncate font-medium text-gray-700"
                    title={row.comments}
                  >
                    {row.comments}
                  </Typography>
                </div>
              ))}
            </div>
          </CardTable>
        </div>

        <div className="flex items-center justify-between px-5 py-3 text-sm text-gray-500">
          <span>1 - 10 of 11 Records</span>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-gray-200 p-1.5">
              <ChevronLeft className="size-4" />
            </button>
            <span className="flex size-7 items-center justify-center rounded-md bg-gray-100 font-medium text-gray-700">
              1
            </span>
            <span className="flex size-7 items-center justify-center rounded-md text-gray-600">
              2
            </span>
            <button className="rounded-md border border-gray-200 p-1.5">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-gray-200 px-3 py-1">10</span>
            <span>per page</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EarnedPointsSummary;
