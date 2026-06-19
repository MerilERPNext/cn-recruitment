import React, { useState } from "react";
import CardTable from "../../shared/CardTable";
import { Card } from "../../shared/atoms/Card";
import { Typography } from "../../shared/atoms/Typography";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Share2,
  SlidersHorizontal,
  Trophy,
  Trash2,
  Upload,
} from "lucide-react";
import Tooltip from "../../shared/Tooltip";
import { AWARD_HISTORY } from "./vibeMockData";

const TABLE_TITLES = [
  "Awards",
  "Values",
  "Received From",
  "Received Date",
  "Actions",
];

const TABLE_WIDTHS = [
  "minmax(260px,1.2fr)",
  "minmax(300px,1.4fr)",
  "190px",
  "150px",
  "150px",
];

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

const AwardActions = () => (
  <div className="flex h-8 w-fit items-center gap-1 rounded-3xl bg-gray-10 px-3 py-1">
    <Tooltip content="Delete" position="top">
      <button
        type="button"
        className="flex items-center justify-center"
        aria-label="Delete award"
      >
        <Trash2 className="h-4 w-4 text-red-400" />
      </button>
    </Tooltip>
    <span className="h-4 w-px bg-gray-300" />
    <Tooltip content="Download" position="top">
      <button
        type="button"
        className="flex items-center justify-center"
        aria-label="Download award"
      >
        <Download className="h-4 w-4 text-primary" />
      </button>
    </Tooltip>
    <span className="h-4 w-px bg-gray-300" />
    <Tooltip content="Share" position="top">
      <button
        type="button"
        className="flex items-center justify-center"
        aria-label="Share award"
      >
        <Share2 className="h-4 w-4 text-info" />
      </button>
    </Tooltip>
    <span className="h-4 w-px bg-gray-300" />
    <Tooltip content="View" position="top">
      <button
        type="button"
        className="flex items-center justify-center"
        aria-label="View award"
      >
        <Eye className="h-4 w-4 text-primary" />
      </button>
    </Tooltip>
  </div>
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

        <div className="overflow-hidden border-y border-gray-100">
          <CardTable
            titles={TABLE_TITLES}
            columnWidths={TABLE_WIDTHS}
            noBorder
            noShadow
            noRound
          >
            <div className="min-w-[1200px]">
              {AWARD_HISTORY.map((row, i) => (
                <div
                  key={`${row.title}-${i}`}
                  className="grid min-h-[78px] items-center gap-4 border-b border-gray-100 px-6 py-4 transition-colors hover:bg-gray-50/70"
                  style={{ gridTemplateColumns: TABLE_WIDTHS.join(" ") }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-50">
                      <Trophy className="size-4 text-amber-400" />
                    </div>
                    <Typography
                      variant="bodySmall"
                      className="truncate font-bold text-gray-800"
                      title={row.title}
                    >
                      {row.title}
                    </Typography>
                  </div>

                  <ValueChips values={row.values} />

                  <Typography
                    variant="bodySmall"
                    className="truncate text-center font-semibold text-blue-600"
                  >
                    {row.receivedFrom}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="text-center font-semibold text-gray-700"
                  >
                    {row.receivedDate}
                  </Typography>

                  <div className="flex justify-center">
                    <AwardActions />
                  </div>
                </div>
              ))}
            </div>
          </CardTable>
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
