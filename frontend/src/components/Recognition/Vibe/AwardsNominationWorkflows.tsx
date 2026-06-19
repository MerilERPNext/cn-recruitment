import React, { useState } from "react";
import CardTable from "../../shared/CardTable";
import { Card } from "../../shared/atoms/Card";
import { Typography } from "../../shared/atoms/Typography";
import {
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

const TABLE_TITLES = [
  "",
  "Nomination ID",
  "Nomination Program Names(ID)",
  "Nominated By",
  "Nomination Date",
  "Last Action Date",
  "Approval Status",
  "Actions",
];

const TABLE_WIDTHS = [
  "52px",
  "150px",
  "minmax(260px,1.4fr)",
  "160px",
  "150px",
  "150px",
  "160px",
  "90px",
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

        <div className="overflow-hidden border-y border-gray-100">
          <CardTable
            titles={TABLE_TITLES}
            columnWidths={TABLE_WIDTHS}
            noBorder
            noShadow
            noRound
          >
            <div className="min-w-[1170px]">
              {NOMINATIONS.map((row) => (
                <div
                  key={row.id}
                  className="grid min-h-[68px] items-center gap-4 border-b border-gray-100 px-6 py-4 transition-colors hover:bg-gray-50/70"
                  style={{ gridTemplateColumns: TABLE_WIDTHS.join(" ") }}
                >
                  <div className="flex justify-center">
                    <input type="checkbox" className="accent-primary" />
                  </div>

                  <Typography
                    variant="bodySmall"
                    className="truncate text-center font-bold text-gray-800"
                  >
                    {row.id}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="truncate font-medium text-gray-700"
                    title={row.program}
                  >
                    {row.program}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="truncate text-center font-semibold text-blue-600"
                  >
                    {row.nominatedBy}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="text-center font-semibold text-gray-700"
                  >
                    {row.nominationDate}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="text-center font-semibold text-gray-700"
                  >
                    {row.lastActionDate}
                  </Typography>

                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      <span className="size-1.5 rounded-full bg-green-500" />
                      {row.status}
                    </span>
                  </div>

                  <div className="flex justify-center">
                    <button className="text-gray-400 hover:text-gray-700">
                      <RowChevron className="size-4" />
                    </button>
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

export default AwardsNominationWorkflows;
