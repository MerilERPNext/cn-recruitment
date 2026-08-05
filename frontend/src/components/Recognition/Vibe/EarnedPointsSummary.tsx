import React, { useMemo, useState } from "react";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import FilterPanel, {
  type DateRange,
  type FilterField,
  type FilterValues,
  type NumberRange,
} from "../../shared/molecules/FilterPanel";
import { Navigate } from "react-router-dom";
import {
  useEmployeePoints,
  useRecognitionFlags,
} from "../../../services/recognitionService";

const REDEMPTION_FILTER_FIELDS: FilterField[] = [
  { key: "dateOfRedemption", label: "Date of Transaction", type: "daterange" },
  { key: "redeemedPoints", label: "Transacted Points", type: "numberrange" },
];

const INITIAL_FILTER_VALUES: FilterValues = {
  dateOfRedemption: { from: "", to: "" },
  redeemedPoints: { min: "", max: "" },
};

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
  // Blocked entirely when hidden in Advanced Settings (hide_rewards_point_summary).
  const recognitionFlags = useRecognitionFlags();

  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || user?.employee || "";

  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValues, setFilterValues] =
    useState<FilterValues>(INITIAL_FILTER_VALUES);

  const dateRange = (filterValues.dateOfRedemption as DateRange) || {
    from: "",
    to: "",
  };
  const pointsRange = (filterValues.redeemedPoints as NumberRange) || {
    min: "",
    max: "",
  };

  const { data: pointsData, isLoading } = useEmployeePoints({
    employee: employeeId,
    redemption_from_date: dateRange.from || undefined,
    redemption_to_date: dateRange.to || undefined,
    min_redeemed_points: pointsRange.min || undefined,
    max_redeemed_points: pointsRange.max || undefined,
  });

  const totalEarned = pointsData?.total_earned_points ?? 0;
  const usedPoints = pointsData?.used_points ?? 0;
  const availablePoints = pointsData?.available_points ?? 0;

  const q = query.trim().toLowerCase();
  const filteredHistory = useMemo(() => {
    const rows = (pointsData?.redemptions ?? []).map((r) => ({
      id: r.name,
      date: r.date ? formatToIndianDate(r.date) : "—",
      orderId: r.name,
      transactionId: r.transaction_id || "—",
      entryType: r.entry_type,
      points: r.points,
      // Points added -> the programme they came from; points redeemed -> the
      // vendor the redemption was made via. Employee Points Entry has no vendor
      // field yet, so redemption rows fall back to the programme/award.
      source:
        r.entry_type === "Redeemed"
          ? r.program_title || r.program || r.award || "—"
          : r.program_title || r.program || r.award || r.recognition_type || "—",
    }));
    if (!q) return rows;
    return rows.filter((row) =>
      [row.date, row.orderId, row.transactionId, String(row.points), row.source]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [pointsData, q]);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  // Page disabled in Advanced Settings — redirect away (blocks direct URL access).
  if (recognitionFlags.loaded && recognitionFlags.hideRewardsPointSummary) {
    return <Navigate to="/webapp/recognition/vibe/dashboard" replace />;
  }

  return (
    <div className="p-4 md:p-6">
      <Typography variant="h2" className="mb-5 text-2xl font-bold">
        Points Summary
      </Typography>

      {/* Summary bar */}
      <Card radius="xl" className="border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col md:flex-row items-stretch gap-4">
          <div className="flex flex-1 items-center justify-between gap-4">
            <Stat value={fmt(totalEarned)} label="Total Earned" />
            <div className="h-12 w-px bg-gray-100" />
            <Stat value={fmt(totalEarned - usedPoints)} label="Net Points" />
          </div>

          <div className="flex flex-1 items-center justify-around rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5 text-white">
            <div className="text-center">
              <Typography variant="h2" className="text-2xl font-bold text-white">
                {fmt(usedPoints)}
              </Typography>
              <Typography variant="bodySmall" className="text-blue-50">
                Redeemed
              </Typography>
            </div>
            <div className="h-12 w-px bg-white/30" />
            <div className="text-center">
              <Typography variant="h2" className="text-2xl font-bold text-white">
                {fmt(availablePoints)}
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label="Filter redemptions"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <Filter className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-blue-50/40 text-sm text-gray-600">
                <th className="px-5 py-3 font-semibold">
                  <span className="flex items-center gap-1">
                    Date of Transaction <ArrowUp className="size-3.5" />
                  </span>
                </th>
                <th className="px-5 py-3 font-semibold">Order ID</th>
                <th className="px-5 py-3 font-semibold">Transaction ID</th>
                <th className="px-5 py-3 font-semibold">Transacted Points</th>
                <th className="px-5 py-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    No records found.
                  </td>
                </tr>
              )}
              {filteredHistory.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                  <td className="px-5 py-4 text-sm text-gray-700">{row.date}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.orderId}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.transactionId}</td>
                  <td
                    className={`px-5 py-4 text-sm font-semibold ${
                      row.entryType === "Earned" ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {row.entryType === "Earned" ? "+" : "-"}
                    {row.points}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 text-sm text-gray-500">
          <span>
            {filteredHistory.length === 0 ? 0 : 1} - {filteredHistory.length} of{" "}
            {filteredHistory.length} Records
          </span>
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

      <FilterPanel
        open={filterOpen}
        fields={REDEMPTION_FILTER_FIELDS}
        values={filterValues}
        onClose={() => setFilterOpen(false)}
        onApply={setFilterValues}
      />
    </div>
  );
};

export default EarnedPointsSummary;
