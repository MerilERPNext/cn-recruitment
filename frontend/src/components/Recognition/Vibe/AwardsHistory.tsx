import React, { useState } from "react";
import { Card } from "../../shared/atoms/Card";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Share2,
  SlidersHorizontal,
  Trophy,
  Upload,
} from "lucide-react";
import { AWARD_HISTORY } from "./vibeMockData";

const ValueChips: React.FC<{ values: string[] }> = ({ values }) => (
  <div className="flex flex-wrap gap-2">
    {values.map((v, i) => (
      <span
        key={i}
        className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 whitespace-nowrap"
      >
        {v}
      </span>
    ))}
  </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <button className="flex items-center gap-1.5 rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-purple-50 transition-colors">
    {icon}
    {label}
  </button>
);

const AwardsHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"Received" | "Given">("Received");

  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumb + center tabs */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-gray-400">···</span>
          <span>/</span>
          <span>All Awards</span>
          <span>/</span>
          <span className="font-semibold text-gray-900">My Awards History</span>
        </div>
        <div className="flex items-center gap-6">
          {(["Received", "Given"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div />
      </div>

      <Card radius="xl" className="border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-end gap-2 p-3">
          <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
            <SlidersHorizontal className="size-4" />
          </button>
          <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
            <Upload className="size-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-blue-50/40 text-sm text-gray-600">
                <th className="px-5 py-3 font-semibold">Awards</th>
                <th className="px-5 py-3 font-semibold">Values</th>
                <th className="px-5 py-3 font-semibold">Received From</th>
                <th className="px-5 py-3 font-semibold">
                  <span className="flex items-center gap-1">
                    Received Date <ArrowUp className="size-3.5" />
                  </span>
                </th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {AWARD_HISTORY.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-50">
                        <Trophy className="size-4 text-amber-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{row.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <ValueChips values={row.values} />
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-blue-600">{row.receivedFrom}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.receivedDate}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <ActionButton icon={<Download className="size-3.5" />} label="Download" />
                      <ActionButton icon={<Share2 className="size-3.5" />} label="Share" />
                      <ActionButton icon={<Eye className="size-3.5" />} label="View" />
                    </div>
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

export default AwardsHistory;
