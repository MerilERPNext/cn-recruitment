import React from "react";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { REDEMPTION_HISTORY } from "./vibeMockData";

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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-blue-50/40 text-sm text-gray-600">
                <th className="px-5 py-3 font-semibold">
                  <span className="flex items-center gap-1">
                    Date of Redemption <ArrowUp className="size-3.5" />
                  </span>
                </th>
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold">Transaction ID</th>
                <th className="px-5 py-3 font-semibold">Redeemed Points</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Comments</th>
              </tr>
            </thead>
            <tbody>
              {REDEMPTION_HISTORY.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-5 py-4 text-sm text-gray-700">{row.date}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.orderId}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.transactionId}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-red-500">{row.points}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.source}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
