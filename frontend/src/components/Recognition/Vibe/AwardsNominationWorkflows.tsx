import React, { useState } from "react";
import { Card } from "../../shared/atoms/Card";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronRight as RowChevron,
  Eye,
  Search,
  Settings2,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { NOMINATIONS } from "./vibeMockData";

const FILTER_PILLS = [
  { label: "INDIVIDUAL AWARDS RECEIVED", count: 9 },
  { label: "INDIVIDUAL AWARDS RAISED", count: 2 },
  { label: "TEAM AWARDS RAISED", count: 0 },
];

const AwardsNominationWorkflows: React.FC = () => {
  const [activePill, setActivePill] = useState(0);

  return (
    <div className="p-4 md:p-6">
      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {FILTER_PILLS.map((pill, i) => (
          <button
            key={pill.label}
            onClick={() => setActivePill(i)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              activePill === i
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {pill.label} {pill.count}
          </button>
        ))}
      </div>

      <Card radius="xl" className="border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
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
              <Settings2 className="size-4" />
            </button>
            <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
              <Eye className="size-4" />
            </button>
            <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
              <Upload className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead>
              <tr className="text-sm text-gray-600 border-y border-gray-100">
                <th className="px-4 py-3 font-semibold">
                  <input type="checkbox" className="accent-primary" />
                </th>
                <th className="px-4 py-3 font-semibold">Nomination ID</th>
                <th className="px-4 py-3 font-semibold">Nomination Program Names(ID)</th>
                <th className="px-4 py-3 font-semibold">Nominated By</th>
                <th className="px-4 py-3 font-semibold">
                  <span className="flex items-center gap-1">
                    Nomination Date <ArrowUp className="size-3.5" />
                  </span>
                </th>
                <th className="px-4 py-3 font-semibold">Last Action Date</th>
                <th className="px-4 py-3 font-semibold">Approval Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {NOMINATIONS.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="accent-primary" />
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-800">{row.id}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 max-w-[280px] truncate">
                    {row.program}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.nominatedBy}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.nominationDate}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.lastActionDate}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      <span className="size-1.5 rounded-full bg-green-500" />
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button className="text-gray-400 hover:text-gray-700">
                      <RowChevron className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 text-sm text-gray-500">
          <span>1 - 9 of 9 Records</span>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-gray-200 p-1.5">
              <ChevronLeft className="size-4" />
            </button>
            <span className="flex size-7 items-center justify-center rounded-md bg-gray-100 font-medium text-gray-700">
              1
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

export default AwardsNominationWorkflows;
