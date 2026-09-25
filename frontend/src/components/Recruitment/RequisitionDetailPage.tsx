/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Badge from "../shared/Badge";
import AllocatedToTooltip from "../shared/AllocatedToTooltip";
import MyApprovalActionPill from "../shared/atoms/MyApprovalActionPill";
import { useActButtonSetting } from "../../hooks/useActButtonSetting";
import useCurrentUser, { isAdminUser } from "../../hooks/useCurrentUser";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { formatToIndianDateWithTime } from "../../utils/formatToIndianDate";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useRequisitionDetails } from "../../hooks/useRequisition";
import type { RequisitionApprovalFlow } from "../../types/requisition";

type TabKey = "overview" | "position_details" | "custom_approval";

/** One labelled figure in the Position Selection summary card. */
const SummaryItem = ({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) => (
  <div>
    <Typography
      variant="bodySmall"
      className="text-gray-500 text-xs mb-0.5 flex items-center gap-1.5"
    >
      {label}
    </Typography>
    <Typography variant="bodySmall" className="font-semibold text-gray-500">
      : {value}
    </Typography>
  </div>
);

const RequisitionDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useScreenSize();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showMaxPositions, setShowMaxPositions] = useState(false);

  // Get requisition data from navigation state
  const requisition = location.state?.requisition;

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // --- Computed values ---
  const positionDetails = useMemo(() => {
    return requisition?.custom_position_details || [];
  }, [requisition?.custom_position_details]);

  const {
    data: requisitionDetails,
    isLoading: isApprovalFlowLoading,
    isError: isApprovalFlowError,
  } = useRequisitionDetails(
    { requisition_name: requisition?.name || "" },
    { enabled: !!requisition?.name },
  );

  const approvalFlow = requisitionDetails?.approval_flow;
  const budgetStatus = requisitionDetails?.budget_status;

  // The detail endpoint is the fuller record; the row the list handed over in
  // navigation state is what shows until it lands.
  const detail = requisitionDetails?.requisition;

  // A Fresher requisition carries its openings per region in `custom_regions`;
  // a Lateral one fills the per-position `custom_position_details` rows. The
  // two are alternates — only one is ever populated (see `available_tables`).
  const regions = useMemo(
    () => detail?.custom_regions ?? requisition?.custom_regions ?? [],
    [detail?.custom_regions, requisition?.custom_regions],
  );

  const isRegionBased = useMemo(() => {
    const hiringType =
      detail?.custom_hiring_type ?? requisition?.custom_hiring_type;
    return hiringType === "Fresher" || regions.length > 0;
  }, [detail?.custom_hiring_type, requisition?.custom_hiring_type, regions]);

  const regionOpenings = useMemo(
    () =>
      regions.reduce(
        (sum: number, row: any) => sum + (Number(row?.no_of_openings) || 0),
        0,
      ),
    [regions],
  );

  const vacancyBreakdown = useMemo(() => {
    return requisition?.custom_vacancy_breakdown || null;
  }, [requisition?.custom_vacancy_breakdown]);

  const newCount = useMemo(() => {
    if (vacancyBreakdown?.new !== undefined) return vacancyBreakdown.new;
    return positionDetails.filter((p: any) => p.vacancy_type === "New").length;
  }, [vacancyBreakdown, positionDetails]);

  const replacementCount = useMemo(() => {
    if (vacancyBreakdown?.replacement !== undefined)
      return vacancyBreakdown.replacement;
    return positionDetails.filter((p: any) => p.vacancy_type === "Replacement")
      .length;
  }, [vacancyBreakdown, positionDetails]);

  const totalPositions = useMemo(() => {
    // `custom_vacancy_breakdown` counts Position Details rows, which a region
    // requisition has none of — its ask is the sum of the regions' openings.
    if (isRegionBased)
      return regionOpenings || requisition?.no_of_positions || 0;
    if (vacancyBreakdown?.total !== undefined) return vacancyBreakdown.total;
    return requisition?.no_of_positions || positionDetails.length || 0;
  }, [
    isRegionBased,
    regionOpenings,
    vacancyBreakdown,
    requisition?.no_of_positions,
    positionDetails,
  ]);

  const maxPositionsAllowed = useMemo(() => {
    return (
      requisition?.custom_max_positions_allowed ||
      requisition?.no_of_positions ||
      totalPositions
    );
  }, [
    requisition?.custom_max_positions_allowed,
    requisition?.no_of_positions,
    totalPositions,
  ]);

  // No data fallback
  if (!requisition) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Typography variant="h4" className="text-gray-700 font-semibold">
          No requisition data found
        </Typography>
        <Typography variant="bodySmall" className="text-gray-500">
          Please go back and select a requisition from the list.
        </Typography>
        <button
          onClick={handleBack}
          className="mt-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; showInfo?: boolean }[] = [
    { key: "overview", label: "Overview" },
    { key: "position_details", label: "Position Details" },
    { key: "custom_approval", label: "Custom Approval Flow", showInfo: true },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Back navigation */}
      <div className="flex items-center gap-2 px-2 pt-1 pb-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
          <span className="font-medium">Back to Requisitions</span>
        </button>
      </div>

      {/* Requisition Header */}
      <div className="px-2 mb-5">
        <div className="flex items-center gap-3 mb-1">
          <Typography variant="h4" className="font-bold text-gray-900">
            {requisition.name}
          </Typography>
          {requisition.status && (
            <Badge
              label={requisition.status}
              backgroundColor={getStatusColor(requisition.status)}
            />
          )}
        </div>
        <Typography variant="bodySmall" className="text-gray-500">
          {requisition.designation_title || requisition.designation} —{" "}
          {requisition.department_title || requisition.department}
        </Typography>
      </div>

      {/* Over Budget — the Department / Cost Center budget left no longer
          covers this live requisition (recruitment.api.requisition_budget). */}
      {budgetStatus?.over_budget && (
        <div className="mx-2 mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
          <div>
            <Typography
              variant="bodySmall"
              className="font-semibold text-red-700"
            >
              Over Budget
            </Typography>
            <Typography variant="bodySmall" className="text-xs text-red-700">
              The budget left no longer covers this requisition.
            </Typography>
            <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
              {budgetStatus.shortfalls.map((row) => (
                <li key={`${row.doctype}-${row.name}`}>{row.summary}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Position Selection Summary Card */}
      <div className="mx-2 mb-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5">
        <Typography
          variant="subheading"
          className="font-bold text-gray-900 mb-4"
        >
          Position Selection
        </Typography>
        <div
          className={`grid gap-4 ${isDesktop ? "grid-cols-4" : "grid-cols-2"}`}
        >
          {isRegionBased ? (
            // New / Replacement is a Position Details distinction — a region
            // requisition has no such split, so it reports its regions instead.
            <SummaryItem label="Number of Region(s)" value={regions.length} />
          ) : (
            <>
              <SummaryItem label="Number of New Position(s)" value={newCount} />
              <SummaryItem
                label="Number of Replacement Position(s)"
                value={replacementCount}
              />
            </>
          )}
          <SummaryItem label="Number of Position(s)" value={totalPositions} />
          <SummaryItem
            label={
              <>
                Max Position(s) Allowed
                <button
                  onClick={() => setShowMaxPositions(!showMaxPositions)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title={
                    showMaxPositions
                      ? "Hide max positions"
                      : "Show max positions"
                  }
                >
                  {showMaxPositions ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            }
            value={showMaxPositions ? maxPositionsAllowed : "***"}
          />
        </div>

        {/* Region breakdown — the openings this requisition is asking for, per
            region. Only a region (Fresher) requisition has these. */}
        {isRegionBased && regions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            {regions.map((row: any, idx: number) => (
              <span
                key={row?.row_name || idx}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5"
              >
                <Typography
                  variant="bodySmall"
                  className="font-semibold text-gray-800"
                >
                  {row?.region || "—"}
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="text-gray-500 text-xs"
                >
                  {Number(row?.no_of_openings) || 0} opening(s)
                </Typography>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mx-2 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-3 text-sm font-medium transition-colors flex items-center gap-1.5
                  ${
                    activeTab === tab.key
                      ? "text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-gray-900 after:rounded-t-full"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {tab.label}
                {tab.showInfo && <Info className="w-4 h-4 text-gray-400" />}
              </button>
            ))}

            {/* Legend (only on position details tab) */}
            {activeTab === "position_details" && !isRegionBased && (
              <div className="ml-auto flex items-center gap-4 pr-2">
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  New
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                  Replacement
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === "overview" && (
            <OverviewTab requisition={requisition} isDesktop={isDesktop} />
          )}
          {activeTab === "position_details" &&
            (isRegionBased ? (
              <RegionDetailsTab
                regions={regions}
                totalOpenings={regionOpenings}
                isDesktop={isDesktop}
              />
            ) : (
              <PositionDetailsTab
                positionDetails={positionDetails}
                isDesktop={isDesktop}
              />
            ))}
          {activeTab === "custom_approval" && (
            <CustomApprovalTab
              approvalFlow={approvalFlow}
              isDesktop={isDesktop}
              isLoading={isApprovalFlowLoading}
              isError={isApprovalFlowError}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Overview Tab ────────────────────────────────────────────────────────

interface OverviewTabProps {
  requisition: Record<string, any>;
  isDesktop: boolean;
}

const hasOverviewValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const OverviewField = ({ label, value }: { label: string; value: unknown }) => (
  <div className="min-w-0 py-3">
    <Typography variant="bodySmall" className="text-xs text-gray-500">
      {label}
    </Typography>
    <Typography
      variant="bodySmall"
      className="mt-1 break-words font-medium text-gray-900"
    >
      {String(value)}
    </Typography>
  </div>
);

const OverviewSection = ({
  title,
  fields,
  isDesktop,
}: {
  title: string;
  fields: { label: string; value: unknown }[];
  isDesktop: boolean;
}) => {
  const visibleFields = fields.filter(({ value }) => hasOverviewValue(value));

  if (visibleFields.length === 0) return null;

  return (
    <section className="border-b border-gray-200 pb-2 last:border-b-0">
      <Typography
        variant="subheading"
        className="pt-1 font-semibold text-gray-900"
      >
        {title}
      </Typography>
      <div
        className={`mt-2 grid gap-x-6 divide-y divide-gray-100 ${isDesktop ? "grid-cols-3" : "grid-cols-1"}`}
      >
        {visibleFields.map((field) => (
          <OverviewField key={field.label} {...field} />
        ))}
      </div>
    </section>
  );
};

const OverviewTab = ({ requisition, isDesktop }: OverviewTabProps) => {
  const experience = [
    requisition.custom_experience_range_from,
    requisition.custom_experience_range_to,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" - ");
  const experienceLabel = experience
    ? `${experience} ${requisition.custom_experience_unit || "years"}`
    : requisition.custom_work_experience ||
      requisition.custom_work_experience_range;
  const salaryRange =
    requisition.custom_salary_range_min || requisition.custom_salary_range_max
      ? `${requisition.custom_salary_range_currency || "INR"} ${requisition.custom_salary_range_min || 0} - ${requisition.custom_salary_range_max || 0}${requisition.custom_salary_timeframe ? ` / ${requisition.custom_salary_timeframe}` : ""}`
      : requisition.custom_salary_range_display;
  const skills = Array.isArray(requisition.custom_skills)
    ? requisition.custom_skills.join(", ")
    : requisition.custom_skills || requisition.custom_additional_skills;
  // Preferred Company is a Table MultiSelect (like Skills), so it arrives as a
  // list. Depending on the endpoint that is either the flattened ids or the raw
  // child rows; a plain string is the shape it carried while it was still a
  // single Link, kept so older records still render.
  const preferredCompanies = Array.isArray(requisition.custom_preferred_company)
    ? (requisition.custom_preferred_company as any[])
        .map((item: any) =>
          item && typeof item === "object"
            ? item.preferred_company_title ||
              item.preferred_company ||
              item.name
            : item,
        )
        .filter(Boolean)
        .join(", ")
    : requisition.custom_preferred_company;
  const qualifications = Array.isArray(requisition.custom_qualifications)
    ? requisition.custom_qualifications
        .map(
          (item: any) =>
            item.qualification_title ||
            item.qualification ||
            item.degree_title ||
            item.degree,
        )
        .filter(Boolean)
        .join(", ")
    : requisition.custom_qualifications;

  return (
    <div className="space-y-6">
      <OverviewSection
        title="Requisition Details"
        isDesktop={isDesktop}
        fields={[
          { label: "Requisition Code", value: requisition.name },
          { label: "Status", value: requisition.status },
          {
            label: "Company",
            value: requisition.company_title || requisition.company,
          },
          {
            label: "Designation",
            value: requisition.designation_title || requisition.designation,
          },
          {
            label: "Department",
            value: requisition.department_title || requisition.department,
          },
          {
            label: "Location",
            value:
              requisition.custom_location_title || requisition.custom_location,
          },
          {
            label: "Employment Type",
            value:
              requisition.custom_employment_type_link_title ||
              requisition.custom_employment_type_link,
          },
          { label: "Hiring Type", value: requisition.custom_hiring_type },
          {
            label: "Functional Area",
            value:
              requisition.custom_functional_area_title ||
              requisition.custom_functional_area,
          },
          {
            label: "Division",
            value:
              requisition.custom_division_title || requisition.custom_division,
          },
          { label: "Number of Positions", value: requisition.no_of_positions },
          {
            label: "Vacancy Type",
            value:
              requisition.custom_type_of_position ||
              requisition.custom_vacancy_breakdown?.type,
          },
        ]}
      />
      <OverviewSection
        title="Request & Assignment"
        isDesktop={isDesktop}
        fields={[
          {
            label: "Requested By",
            value:
              requisition.requested_by_title ||
              requisition.requested_by_name ||
              requisition.requested_by,
          },
          {
            label: "Requester Department",
            value:
              requisition.requested_by_dept_title ||
              requisition.requested_by_dept,
          },
          {
            label: "Requester Designation",
            value:
              requisition.requested_by_designation_title ||
              requisition.requested_by_designation,
          },
          {
            label: "Hiring Lead",
            value:
              requisition.custom_hiring_lead_title ||
              requisition.custom_hiring_lead,
          },
          {
            label: "Assigned Recruiter",
            value:
              requisition.custom_assign_to_recruiter_title ||
              requisition.custom_assign_to_recruiter,
          },
          {
            label: "Expected Compensation",
            value: requisition.expected_compensation
              ? `INR ${Number(requisition.expected_compensation).toLocaleString("en-IN")}`
              : null,
          },
          { label: "Experience", value: experienceLabel },
          { label: "Salary Range", value: salaryRange },
          {
            label: "Preferred Notice Period",
            value: requisition.custom_preferred_notice_period,
          },
          { label: "Preferred Company", value: preferredCompanies },
          {
            label: "Posting Date",
            value: requisition.posting_date
              ? formatToIndianDateWithTime(requisition.posting_date)
              : null,
          },
          {
            label: "Expected By",
            value: requisition.expected_by
              ? formatToIndianDateWithTime(requisition.expected_by)
              : null,
          },
          {
            label: "Created On",
            value: requisition.creation
              ? formatToIndianDateWithTime(requisition.creation)
              : null,
          },
          {
            label: "Last Updated",
            value: requisition.modified
              ? formatToIndianDateWithTime(requisition.modified)
              : null,
          },
        ]}
      />
      <OverviewSection
        title="Requirements"
        isDesktop={isDesktop}
        fields={[
          { label: "Qualifications", value: qualifications },
          { label: "Skills", value: skills },
          {
            label: "Reason for Request",
            value: requisition.reason_for_requesting,
          },
          {
            label: "Additional Roles & Responsibilities",
            value: requisition.custom_additional_roles__responsibilities,
          },
          {
            label: "Comments / Instructions",
            value: requisition.custom_comments__instructions,
          },
          { label: "Cost Centre", value: requisition.custom_cost_centre },
        ]}
      />
    </div>
  );
};

// ─── Region Details Tab ──────────────────────────────────────────────────

// The Fresher counterpart of PositionDetailsTab: a Fresher requisition asks for
// N openings in each of a set of regions rather than describing each position
// individually, so `custom_regions` is what there is to show.
interface RegionDetailsTabProps {
  regions: any[];
  totalOpenings: number;
  isDesktop: boolean;
}

const RegionDetailsTab = ({
  regions,
  totalOpenings,
  isDesktop,
}: RegionDetailsTabProps) => {
  if (!regions || regions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Typography variant="bodySmall">No regions specified.</Typography>
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div className="space-y-3">
        {regions.map((row: any, idx: number) => (
          <div
            key={row?.row_name || idx}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-3"
          >
            <span className="w-1 h-8 rounded-full bg-green-500" />
            <div className="flex-1">
              <Typography
                variant="bodySmall"
                className="font-semibold text-gray-900"
              >
                {row?.region || "—"}
              </Typography>
              <Typography variant="bodySmall" className="text-gray-500 text-xs">
                No. of Openings
              </Typography>
            </div>
            <Typography
              variant="bodySmall"
              className="font-semibold text-gray-900"
            >
              {Number(row?.no_of_openings) || 0}
            </Typography>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
          <Typography variant="bodySmall" className="font-bold text-gray-800">
            Total
          </Typography>
          <Typography variant="bodySmall" className="font-bold text-gray-900">
            {totalOpenings}
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Region
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              No. of Openings
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {regions.map((row: any, idx: number) => (
            <tr
              key={row?.row_name || idx}
              className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors"
            >
              <td className="px-5 py-4 text-sm text-gray-900">
                <div className="flex items-center gap-2.5">
                  <span className="w-1 h-6 rounded-lg bg-green-500 inline-block" />
                  {row?.region || "—"}
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-gray-900">
                {Number(row?.no_of_openings) || 0}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="px-5 py-3.5 text-sm font-bold text-gray-800">
              Total
            </td>
            <td className="px-5 py-3.5 text-sm font-bold text-gray-900">
              {totalOpenings}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ─── Position Details Tab ────────────────────────────────────────────────

// Per-position approval state (`approval_status` on the Position Details row) —
// tracked separately from the requisition's own status, since an approver can
// clear some positions and hold others.
const POSITION_STATUS_STYLES: Record<string, string> = {
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Pending: "bg-yellow-100 text-yellow-700",
};

const positionStatusOf = (pos: any): string =>
  pos?.approval_status || "Pending";

const positionStatusStyle = (status: string): string =>
  POSITION_STATUS_STYLES[status] || "bg-gray-100 text-gray-600";

/** "Approved by X on <date>" — only once the row has actually been actioned. */
const positionStatusDetail = (pos: any): string | null => {
  const by = pos?.approved_by_title || pos?.approved_by;
  const on = pos?.approved_on
    ? formatToIndianDateWithTime(pos.approved_on)
    : null;
  if (!by && !on) return null;
  return [by, on].filter(Boolean).join(" · ");
};

interface PositionDetailsTabProps {
  positionDetails: any[];
  isDesktop: boolean;
}

const PositionDetailsTab = ({
  positionDetails,
  isDesktop,
}: PositionDetailsTabProps) => {
  if (!positionDetails || positionDetails.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Typography variant="bodySmall">No positions specified.</Typography>
      </div>
    );
  }

  if (!isDesktop) {
    // Mobile card view
    return (
      <div className="space-y-3">
        {positionDetails.map((pos: any, idx: number) => {
          const isReplacement = pos.vacancy_type === "Replacement";
          return (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-1 h-8 rounded-full ${
                    isReplacement ? "bg-orange-400" : "bg-green-500"
                  }`}
                />
                <Typography
                  variant="bodySmall"
                  className="font-bold text-gray-900"
                >
                  Position {idx + 1}
                </Typography>
                <Badge
                  label={pos.vacancy_type || "New"}
                  size="sm"
                  backgroundColor={
                    isReplacement
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-700"
                  }
                />
                <Badge
                  label={positionStatusOf(pos)}
                  size="sm"
                  backgroundColor={positionStatusStyle(positionStatusOf(pos))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Functional Area</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {pos.functional_area_title || pos.functional_area || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Location</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {pos.custom_location_title || pos.location_title || pos.location || "—"}
                  </p>
                </div>
                {isReplacement && (
                  <div>
                    <span className="text-gray-500">Replacement for</span>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {pos.replacement_for ? (
                        <WrapperHoverCard
                          employeeId={String(pos.replacement_for)}
                        >
                          <span className="cursor-help underline decoration-dotted decoration-gray-300 underline-offset-2">
                            {pos.replacement_for_title || pos.replacement_for}
                          </span>
                        </WrapperHoverCard>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Reporting Manager</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {pos.reporting_manager ? (
                      <WrapperHoverCard
                        employeeId={String(pos.reporting_manager)}
                      >
                        <span className="cursor-help underline decoration-dotted decoration-gray-300 underline-offset-2">
                          {pos.reporting_manager_title || pos.reporting_manager}
                        </span>
                      </WrapperHoverCard>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Employee Type</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {pos.employee_type_title || pos.employee_type || "—"}
                  </p>
                </div>
                {positionStatusDetail(pos) && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Actioned by</span>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {positionStatusDetail(pos)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Position Number
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Functional Area
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Location <span className="text-red-500">*</span>
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Replacement for <span className="text-red-500">*</span>
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Reporting manager <span className="text-red-500">*</span>
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Employee Type <span className="text-red-500">*</span>
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {positionDetails.map((pos: any, idx: number) => {
            const isReplacement = pos.vacancy_type === "Replacement";
            return (
              <tr
                key={idx}
                className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors align-top"
              >
                {/* Position Number with colored left bar */}
                <td className="px-5 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-[3px] h-6 rounded-lg flex-shrink-0 ${
                        isReplacement ? "bg-orange-400" : "bg-green-500"
                      }`}
                    />
                    <span>{pos.position_number || idx + 1}</span>
                  </div>
                </td>

                {/* Functional Area */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  {pos.functional_area_title || pos.functional_area || "—"}
                </td>

                {/* Location */}
                <td className="px-5 py-4 text-sm text-gray-700 max-w-[260px]">
                  <span className="whitespace-pre-line leading-relaxed">
                    {pos.custom_location_title || pos.location_title || pos.location || "—"}
                  </span>
                </td>

                {/* Replacement for */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  {pos.replacement_for ? (
                    <WrapperHoverCard employeeId={String(pos.replacement_for)}>
                      <span className="cursor-help underline decoration-dotted decoration-gray-300 underline-offset-2">
                        {pos.replacement_for_title
                          ? `${pos.replacement_for_title} (${pos.replacement_for})`
                          : pos.replacement_for}
                      </span>
                    </WrapperHoverCard>
                  ) : (
                    "—"
                  )}
                </td>

                {/* Reporting manager */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  {pos.reporting_manager ? (
                    <WrapperHoverCard
                      employeeId={String(pos.reporting_manager)}
                    >
                      <span className="cursor-help underline decoration-dotted decoration-gray-300 underline-offset-2">
                        {pos.reporting_manager_title
                          ? `${pos.reporting_manager_title} (${pos.reporting_manager})`
                          : pos.reporting_manager}
                      </span>
                    </WrapperHoverCard>
                  ) : (
                    "—"
                  )}
                </td>

                {/* Employee Type */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  {pos.employee_type_title || pos.employee_type || "—"}
                </td>

                {/* Approval status of this position */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  <Badge
                    label={positionStatusOf(pos)}
                    size="sm"
                    backgroundColor={positionStatusStyle(positionStatusOf(pos))}
                  />
                  {positionStatusDetail(pos) && (
                    <p className="mt-1 text-xs text-gray-500">
                      {positionStatusDetail(pos)}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Custom Approval Tab ─────────────────────────────────────────────────

interface CustomApprovalTabProps {
  approvalFlow?: RequisitionApprovalFlow;
  isDesktop: boolean;
  isLoading: boolean;
  isError: boolean;
}

const CustomApprovalTab = ({
  approvalFlow,
  isDesktop,
  isLoading,
  isError,
}: CustomApprovalTabProps) => {
  const [expandedStages, setExpandedStages] = useState<number[]>([]);
  const stages = approvalFlow?.stages || [];
  const { data: currentUser } = useCurrentUser();
  const isSystemManager = isAdminUser(currentUser || null);
  // System Manager Act button: uses the same show_act_button_on_all_tasks setting
  // as Phase 1 My Requests — shows Act button on all pending stages when enabled,
  // or on unassigned pending stages when disabled.
  const { data: showActOnAllTasks = false } = useActButtonSetting();

  const toggleStage = (stageIndex: number) => {
    setExpandedStages((current) =>
      current.includes(stageIndex)
        ? current.filter((index) => index !== stageIndex)
        : [...current, stageIndex],
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <Typography variant="bodySmall">Loading approval flow...</Typography>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 text-red-600">
        <Typography variant="bodySmall">
          Unable to load the approval flow.
        </Typography>
      </div>
    );
  }

  if (!approvalFlow?.has_approval || stages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Typography variant="bodySmall">
          No approval flow configured.
        </Typography>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        {approvalFlow.mode} approval flow{" "}
        {approvalFlow.tracker ? `· ${approvalFlow.tracker}` : ""}
      </div>
      {stages.map((stage) => {
        const isExpanded = expandedStages.includes(stage.stage_index);
        const rowApprovals = stage.row_approvals || [];

        return (
          <div
            key={stage.stage_index}
            className="border-b border-gray-100 last:border-b-0"
          >
            <div
              className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-4 py-4 hover:bg-primary/10"
              onClick={() => toggleStage(stage.stage_index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleStage(stage.stage_index);
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Typography
                    variant="bodySmall"
                    className="font-semibold text-gray-900"
                  >
                    {stage.stage_name}
                  </Typography>
                  <AllocatedToTooltip
                    users={stage.approvers}
                    title="Approvers"
                    position="bottom"
                  >
                    <Badge
                      label={stage.status || "Not started"}
                      size="sm"
                      backgroundColor={getStatusColor(stage.status || "")}
                    />
                  </AllocatedToTooltip>
                  {/* Act button for System Manager — shown when setting is on (all tasks)
                      or when off for unassigned tasks with a linked ToDo action */}
                  {isSystemManager &&
                    (showActOnAllTasks || !(stage.approvers && stage.approvers.length > 0)) &&
                    stage.status === "Pending" &&
                    stage.todo_id && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <MyApprovalActionPill
                        todoId={stage.todo_id}
                        isPendingStatus={true}
                        requestItem={{
                          todo_id: stage.todo_id,
                          custom_doctype_actions: stage.custom_doctype_actions ?? null,
                          custom_approval_type: stage.custom_approval_type ?? null,
                          reference_type: "Job Requisition",
                          reference_name: approvalFlow?.requisition ?? "",
                          allocated_to: [],
                          allocated_roles: [],
                          role_assigned_users: [],
                          assigned_users_count: 0,
                          allocated_to_emp_id: null,
                          role: null,
                          username: null,
                        }}
                        canNudge={false}
                      />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>
                    Triggered:{" "}
                    {stage.trigger_date
                      ? formatToIndianDateWithTime(stage.trigger_date)
                      : "—"}
                  </span>
                  {stage.rows && (
                    <span>
                      Out of {stage.rows.total} positions -{" "}
                      {stage.rows.approved ?? 0} approved,{" "}
                      {stage.rows.rejected ?? 0} rejected
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown
                className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ease-out ${isExpanded ? "rotate-180" : ""}`}
              />
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={`border-t border-gray-100 bg-gray-50/70 px-4 py-4 transition-opacity duration-150 ${isExpanded ? "opacity-100" : "opacity-0"}`}
                >
                  {rowApprovals.length ? (
                    <div
                      className={isDesktop ? "overflow-x-auto" : "space-y-3"}
                    >
                      {isDesktop ? (
                        <table className="min-w-full text-sm">
                          <thead className="text-left text-xs text-gray-500">
                            <tr>
                              <th className="pb-2 font-medium">Position</th>
                              <th className="pb-2 font-medium">Approver(s)</th>
                              <th className="pb-2 font-medium">Status</th>
                              <th className="pb-2 font-medium">
                                Action Taken By
                              </th>
                              <th className="pb-2 font-medium">Completed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {rowApprovals.map((row) => (
                              <tr
                                key={row.row_docnames?.join("-") || row.label}
                              >
                                <td className="px-3 py-3 font-medium text-gray-900">
                                  {row.label}
                                </td>
                                <td className="px-3 py-3 text-gray-700">
                                  {row.approvers?.join(", ") || "—"}
                                </td>
                                <td className="px-3 py-3">
                                  <Badge
                                    label={row.status || "Not started"}
                                    size="sm"
                                    backgroundColor={getStatusColor(
                                      row.status || "",
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-3 text-gray-700">
                                  {row.action_taken_by?.join(", ") || "—"}
                                </td>
                                <td className="px-3 py-3 text-gray-700">
                                  {row.completed_date
                                    ? formatToIndianDateWithTime(
                                        row.completed_date,
                                      )
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        rowApprovals.map((row) => (
                          <div
                            key={row.row_docnames?.join("-") || row.label}
                            className="rounded-md border border-gray-200 bg-white p-3 text-xs"
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <span className="font-semibold text-gray-900">
                                {row.label}
                              </span>
                              <Badge
                                label={row.status || "Not started"}
                                size="sm"
                                backgroundColor={getStatusColor(
                                  row.status || "",
                                )}
                              />
                            </div>
                            <p className="text-gray-500">
                              Approver(s):{" "}
                              <span className="text-gray-800">
                                {row.approvers?.join(", ") || "—"}
                              </span>
                            </p>
                            <p className="mt-1 text-gray-500">
                              Action taken by:{" "}
                              <span className="text-gray-800">
                                {row.action_taken_by?.join(", ") || "—"}
                              </span>
                            </p>
                            <p className="mt-1 text-gray-500">
                              Completed:{" "}
                              <span className="text-gray-800">
                                {row.completed_date
                                  ? formatToIndianDateWithTime(
                                      row.completed_date,
                                    )
                                  : "—"}
                              </span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <Typography variant="bodySmall" className="text-gray-500">
                      No position-level approvals for this stage.
                    </Typography>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "approved active":
    case "completed":
    case "open":
      return "bg-green-100 text-green-700";
    case "approval pending":
      return "bg-yellow-100 text-yellow-700";
    case "draft":
    case "approved draft":
      return "bg-orange-100 text-orange-700";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "auto archived":
    case "closed":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-50 text-gray-600";
  }
};

export default RequisitionDetailPage;
