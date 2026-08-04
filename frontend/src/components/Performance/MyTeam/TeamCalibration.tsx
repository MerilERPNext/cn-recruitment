import { Check } from "lucide-react";
import React from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Avatar from "../../shared/Avatar";
import Button from "../../shared/atoms/Button";
import CardTable from "../../shared/CardTable";
import CustomDropdown from "../../shared/CustomDropdown";
import DataListView from "../../DataListView";
import { Typography } from "../../shared/atoms/Typography";
import { CALIBRATION_EMPLOYEES, DISTRIBUTION } from "./mockData";
import type { FrappePageResponse } from "../../../types/frappe";
import type { CalibrationEmployee, PerfRating } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRatingColor = (rating: PerfRating) => {
  switch (rating) {
    case "Outstanding":
    case "Exceeds":
      return { text: "text-green-700", dot: "bg-green-500", bg: "bg-green-50" };
    case "Meets":
      return { text: "text-blue-600", dot: "bg-blue-500", bg: "bg-blue-50" };
    case "Below":
      return { text: "text-amber-600", dot: "bg-amber-500", bg: "bg-amber-50" };
    case "Unsatisfactory":
      return { text: "text-red-600", dot: "bg-red-500", bg: "bg-red-50" };
    default:
      return {
        text: "text-gray-400",
        dot: "bg-transparent",
        bg: "bg-transparent",
      };
  }
};

const RATING_OPTIONS = [
  { label: "Outstanding", value: "Outstanding" },
  { label: "Exceeds", value: "Exceeds" },
  { label: "Meets", value: "Meets" },
  { label: "Below", value: "Below" },
  { label: "Unsatisfactory", value: "Unsatisfactory" },
];

const RatingCell = ({ rating }: { rating: PerfRating }) => {
  if (rating === "-") {
    return (
      <Typography variant="bodySmall" className="font-bold text-gray-400">
        —
      </Typography>
    );
  }

  const { text, bg } = getRatingColor(rating);

  return (
    <div
      className={`flex items-center ${text} ${bg} font-bold text-xs px-2 py-0.5 rounded-xl w-fit`}
    >
      <Typography variant="label" className={text}>
        {rating}
      </Typography>
    </div>
  );
};

const CALIBRATION_TABLE_TITLES = [
  "Employee",
  "FY24",
  "FY25",
  "Self",
  "Peer Avg",
  "My Proposal",
  "9-Box",
];

const CALIBRATION_TABLE_COLUMN_WIDTHS = [
  "minmax(260px, 2fr)",
  "minmax(120px, 0.9fr)",
  "minmax(140px, 1fr)",
  "minmax(160px, 1.1fr)",
  "minmax(160px, 1.1fr)",
  "minmax(150px, 1fr)",
  "minmax(110px, 0.8fr)",
];

const NineBox = ({ highlight }: { highlight: [number, number] }) => (
  <div className="grid grid-cols-3 gap-[2px] w-[28px] h-[28px]">
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => {
        const isHighlighted = r === highlight[0] && c === highlight[1];
        return (
          <div
            key={`${r}-${c}`}
            className={`w-[8px] h-[8px] rounded-[1px] flex items-center justify-center ${isHighlighted ? "bg-[#1a73e8]" : "bg-gray-100"}`}
          >
            {isHighlighted && (
              <div className="w-[3px] h-[3px] bg-white rounded-full" />
            )}
          </div>
        );
      }),
    )}
  </div>
);

interface CalibrationEmployeeItemProps {
  item: CalibrationEmployee;
  onProposalChange: (employeeId: string, value: PerfRating) => void;
}

const CalibrationEmployeeItem = ({
  item: emp,
  onProposalChange,
}: CalibrationEmployeeItemProps) => {
  const { isDesktop } = useScreenSize();
  const handleProposalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onProposalChange(emp.id, event.target.value as PerfRating);
  };

  if (!isDesktop) {
    return (
      <div className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl mt-2 w-full">
        <div className="p-4 flex items-start gap-3 w-full">
          <Avatar
            name={emp.name}
            fontSize="text-xs"
            size="h-9 w-9"
            avatarBgColor="bg-blue-50"
            avatarTextColor="text-blue-600"
          />
          <div className="min-w-0 flex-1">
            <Typography variant="mobileCardTitle" className="break-words">
              {emp.name}
            </Typography>
            <Typography variant="mobileCardSubtitle" className="block">
              {emp.role}
            </Typography>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Typography variant="mobileCardLabel" className="block">
                  FY24
                </Typography>
                <RatingCell rating={emp.fy24} />
              </div>
              <div className="min-w-0">
                <Typography variant="mobileCardLabel" className="block">
                  FY25
                </Typography>
                <RatingCell rating={emp.fy25} />
              </div>
              <div className="min-w-0">
                <Typography variant="mobileCardLabel" className="block">
                  Self
                </Typography>
                <RatingCell rating={emp.self} />
              </div>
              <div className="min-w-0">
                <Typography variant="mobileCardLabel" className="block">
                  Peer Avg
                </Typography>
                <RatingCell rating={emp.peerAvg} />
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="min-w-0">
                <Typography variant="mobileCardLabel" className="block">
                  My Proposal
                </Typography>
                <CustomDropdown
                  value={emp.myProposal}
                  onChange={handleProposalChange}
                  options={RATING_OPTIONS}
                  position="bottom-right"
                  className="mt-1 [&>button]:w-36 [&>button]:justify-between"
                  menuClassName="w-40 min-w-0"
                />
              </div>
              <div className="shrink-0 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  9-Box
                </Typography>
                <div className="mt-1 flex justify-end">
                  <NineBox highlight={emp.gridHighlight} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid min-h-20 items-center gap-4 border-b border-gray-100 px-6 py-5 transition-colors hover:bg-primary/10"
      style={{
        gridTemplateColumns: CALIBRATION_TABLE_COLUMN_WIDTHS.join(" "),
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          name={emp.name}
          fontSize="text-xs"
          size="h-8 w-8"
          avatarBgColor="bg-blue-50"
          avatarTextColor="text-blue-600"
        />
        <div className="flex min-w-0 flex-col">
          <Typography
            variant="bodySmall"
            className="truncate font-bold leading-tight text-gray-900"
          >
            {emp.name}
          </Typography>
          <Typography
            variant="caption"
            className="mt-[1px] block truncate text-gray-500"
          >
            {emp.role}
          </Typography>
        </div>
      </div>

      <div className="flex justify-center">
        <RatingCell rating={emp.fy24} />
      </div>
      <div className="flex justify-center">
        <RatingCell rating={emp.fy25} />
      </div>
      <div className="flex justify-center">
        <RatingCell rating={emp.self} />
      </div>
      <div className="flex justify-center">
        <RatingCell rating={emp.peerAvg} />
      </div>

      <div className="flex justify-center">
        <CustomDropdown
          value={emp.myProposal}
          onChange={handleProposalChange}
          options={RATING_OPTIONS}
          position="bottom-right"
          className="[&>button]:w-36 [&>button]:justify-between"
          menuClassName="w-40 min-w-0"
        />
      </div>

      <div className="flex justify-center">
        <NineBox highlight={emp.gridHighlight} />
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const TeamCalibration: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;
  const [proposals, setProposals] = React.useState<Record<string, PerfRating>>(
    () =>
      CALIBRATION_EMPLOYEES.reduce<Record<string, PerfRating>>(
        (acc, employee) => {
          acc[employee.id] = employee.myProposal;
          return acc;
        },
        {},
      ),
  );
  const calibrationEmployees = React.useMemo(
    () =>
      CALIBRATION_EMPLOYEES.map((employee) => ({
        ...employee,
        myProposal: proposals[employee.id] ?? employee.myProposal,
      })),
    [proposals],
  );
  const handleProposalChange = React.useCallback(
    (employeeId: string, value: PerfRating) => {
      setProposals((prev) => ({ ...prev, [employeeId]: value }));
    },
    [],
  );
  const fetchEmployees = React.useCallback(async (): Promise<FrappePageResponse> => {
    return {
      data: calibrationEmployees as unknown as FrappePageResponse["data"],
      totalCount: calibrationEmployees.length,
      hasNextPage: false,
      pages: [],
    };
  }, [calibrationEmployees]);

  // Max value in distribution to scale heights (60 is the max target)
  const maxScale = Math.max(
    ...DISTRIBUTION.flatMap((b) => [b.target, b.actual]),
    100,
  );

  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] font-sans ${isMobile ? "p-4" : "p-1 pb-10"}`}
    >
      <div className="mx-auto w-full max-w-screen space-y-5">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className={`flex ${isCompact ? "flex-col gap-4" : "items-end justify-between"} mb-6`}
        >
          <div className="space-y-1">
            <Typography
              variant="label"
              className="mb-1 inline-block rounded-xl bg-amber-100 px-2.5 py-0.5 text-amber-800"
            >
              Pre-calibration - Manager view
            </Typography>
            <Typography
              variant="h4"
              className="tracking-tight leading-tight text-gray-900"
            >
              Calibration Prep · Design Oxygen Team
            </Typography>
            <Typography
              variant="bodySmall"
              className="block font-medium text-gray-500"
            >
              Aditi Sharma's session · 5 Jun 2026 - 14:00 IST · Soft target
              distribution
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              bgColor="primary"
              size="sm"
              icon={
                <div className="grid grid-cols-3 gap-[1px] w-3 h-3">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-[#1a73e8] rounded-[1px]" />
                  ))}
                </div>
              }
            >
              View team on 9-Box
            </Button>
            <Button variant="contain" bgColor="primary" size="sm">
              Submit my proposals
            </Button>
          </div>
        </div>

        {/* ── Distribution Card ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <Typography variant="subheading" className="text-gray-900">
                Your team's distribution
              </Typography>
              <Typography variant="caption" className="block text-gray-500">
                vs target (soft curve)
              </Typography>
            </div>
            <div className="flex items-center gap-1.5 text-green-700 font-bold text-xs">
              <Check className="w-3.5 h-3.5" />
              <Typography variant="label" className="text-green-700">
                Within ±5% of target
              </Typography>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="flex justify-between items-end h-[140px] px-4 sm:px-8 mb-2 min-w-[600px]">
              {DISTRIBUTION.map((bucket) => {
                const targetHeight = (bucket.target / maxScale) * 100;
                const actualHeight = (bucket.actual / maxScale) * 100;

                return (
                  <div
                    key={bucket.label}
                    className="flex flex-col items-center gap-2.5 w-32 h-full"
                  >
                    {/* Bars */}
                    <div className="flex items-end gap-1.5 h-full w-full justify-center">
                      <div
                        className="w-[12px] bg-gray-200 rounded-t-[2px]"
                        style={{ height: `${targetHeight}%` }}
                      />
                      <div
                        className={`w-[12px] rounded-t-[2px] ${bucket.isRed ? "bg-[#e11d48]" : "bg-[#1a73e8]"}`}
                        style={{ height: `${actualHeight}%` }}
                      />
                    </div>

                    {/* Labels */}
                    <div className="text-center shrink-0">
                      <Typography
                        variant="label"
                        className="block text-gray-900 leading-tight"
                      >
                        {bucket.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="mt-[1px] block font-semibold text-gray-400"
                      >
                        Target {bucket.target}% / Actual {bucket.actual}%
                      </Typography>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-gray-200 rounded-sm" />
              <Typography variant="label" className="text-gray-500">
                Target distribution
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#1a73e8] rounded-sm" />
              <Typography variant="label" className="text-gray-500">
                Actual
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#e11d48] rounded-sm" />
              <Typography variant="label" className="text-gray-500">
                Outside band
              </Typography>
            </div>
          </div>
        </div>

        {/* ── Employee Table ──────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <CardTable
            titles={CALIBRATION_TABLE_TITLES}
            columnWidths={CALIBRATION_TABLE_COLUMN_WIDTHS}
            noBorder
            noShadow
            noRound
          >
            <div className={isCompact ? "w-full" : "w-full min-w-[1100px]"}>
              <DataListView<CalibrationEmployee>
                queryKey={[
                  "team-calibration-employees",
                  JSON.stringify(proposals),
                ]}
                fetchFunction={fetchEmployees}
                isSearch={false}
                showPagination={false}
                showRefreshButton={false}
                pageSize={calibrationEmployees.length}
                infiniteScroll={false}
                loadMorePagination={false}
                enableUrlParams={false}
                getItemKey={(item) => item.id}
                ItemComponent={({ item: emp }) => (
                  <CalibrationEmployeeItem
                    item={emp}
                    onProposalChange={handleProposalChange}
                  />
                )}
              />
            </div>
          </CardTable>
        </div>
      </div>
    </main>
  );
};

export default TeamCalibration;
