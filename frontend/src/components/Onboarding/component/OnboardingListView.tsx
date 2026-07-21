/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import StatusBadge from "../../shared/atoms/statusBadge";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import DataListView from "../../DataListView";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useNavigate } from "react-router-dom";


// ─── Raw API shape ────────────────────────────────────────────────────────────
interface FieldStatusCounts {
  total: number;
  pending: number;
  filled: number;
  approved: number;
  rejected: number;
}

interface ApiOnboardingItem {
  department_title: string;
  designation_title: string;
  name: string;
  employee_name: string;
  job_applicant: string;
  employee: string | null;
  department: string | null;
  designation: string | null;
  date_of_joining: string;
  boarding_begins_on: string;
  boarding_status: string;
  // Per-row field-approval counts returned by the list API (one grouped query
  // over the onboarding portal child table). Used to render the progress bar.
  field_status_counts?: FieldStatusCounts;
}

// ─── UI shape ────────────────────────────────────────────────────────────────
interface UiOnboarding {
  id: string;
  employeeName: string;
  jobApplicant: string;
  employee: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  boardingBeginsOn: string;
  boardingStatus: string;
  // Field-approval progress (derived from field_status_counts).
  approved: number;
  rejected: number;
  pending: number;
  filled: number;
  totalFields: number;
  details: {
    referenceNo: string;
    employeeName: string;
    jobApplicant: string;
    employee: string;
    department: string;
    designation: string;
    dateOfJoining: string;
    boardingBeginsOn: string;
    boardingStatus: string;
  };
}

// ─── Mapper ──────────────────────────────────────────────────────────────────
const mapOnboardingData = (rawData: ApiOnboardingItem[]): UiOnboarding[] => {
  if (!Array.isArray(rawData)) return [];
  return rawData.map((item) => {
    const counts = item.field_status_counts;
    // Use the real per-status buckets from the API — they already sum to total
    // (pending + filled + approved + rejected === total).
    const totalFields = counts?.total ?? 0;
    const approved = counts?.approved ?? 0;
    const rejected = counts?.rejected ?? 0;
    const filled = counts?.filled ?? 0;
    const pending = counts?.pending ?? 0;

    return {
    id: item.name,
    employeeName: item.employee_name ?? "—",
    jobApplicant: item.job_applicant ?? "—",
    employee: item.employee ?? "—",
    department: item.department ?? "—",
    designation: item.designation_title ?? "—",
    dateOfJoining: item.date_of_joining ?? "—",
    boardingBeginsOn: item.boarding_begins_on ?? "—",
    boardingStatus: item.boarding_status ?? "—",
    approved,
    rejected,
    pending,
    filled,
    totalFields,
    details: {
      referenceNo: item.name,
      employeeName: item.employee_name ?? "—",
      jobApplicant: item.job_applicant ?? "—",
      employee: item.employee ?? "—",
      department: item.department_title ?? "—",
      designation: item.designation ?? "—",
      dateOfJoining: item.date_of_joining ?? "—",
      boardingBeginsOn: item.boarding_begins_on ?? "—",
      boardingStatus: item.boarding_status ?? "—",
    },
    };
  });
};

const ONBOARDING_SORT_CONFIG: ColumnSortConfig[] = [
  { sortable: true, type: "string", field: "employee_name", getValue: (item: any) => item.employeeName ?? "" },
  { sortable: true, type: "string", field: "department", getValue: (item: any) => item.department ?? "" },
  { sortable: true, type: "string", field: "designation", getValue: (item: any) => item.designation ?? "" },
  { sortable: true, type: "date", field: "date_of_joining", getValue: (item: any) => item.dateOfJoining ?? "" },
  { sortable: true, type: "date", field: "boarding_begins_on", getValue: (item: any) => item.boardingBeginsOn ?? "" },
  { sortable: false },
  { sortable: false },
];

// ─── Field progress bar ───────────────────────────────────────────────────────
// A single completion bar whose width = share of fields filled in
// (approved + filled) / total. Per the client requirement the bar colour is
// driven by that percentage:
//   0–30%   → red
//   31–70%  → amber
//   71–100% → green
// Hovering shows the full status breakdown.
function ApprovalProgressBar({
  approved,
  filled,
  rejected,
  pending,
  total,
  mobile = false,
  complete = false,
}: {
  approved: number;
  filled: number;
  rejected: number;
  pending: number;
  total: number;
  // Mobile renders full-width with an inline breakdown (touch has no hover);
  // desktop keeps the compact bar + hover tooltip.
  mobile?: boolean;
  // When the onboarding status is Completed, force a full (100%) bar
  // regardless of the per-field counts.
  complete?: boolean;
}) {
  if (!total && !complete) {
    return <span className="text-xs text-gray-400">No fields</span>;
  }

  // Completion = filled fields over total; a Completed status always shows 100%.
  const completed = complete ? total : filled;
  const percent = complete
    ? 100
    : Math.min(100, Math.round((completed / total) * 100));

  // Client-defined colour thresholds.
  const colour =
    percent <= 30
      ? { bar: "bg-red-500", text: "text-red-600" }
      : percent <= 70
        ? { bar: "bg-amber-500", text: "text-amber-600" }
        : { bar: "bg-emerald-500", text: "text-emerald-600" };

  return (
    <div className={`group relative w-full ${mobile ? "" : "max-w-[220px]"}`}>
      {/* Percentage */}
      <div
        className={`mb-1 ${mobile ? "flex items-center justify-between text-[11px]" : "text-center text-[10px]"} font-semibold leading-none ${colour.text}`}
      >
        <span>{percent}% Filled</span>
        {mobile && <span className="text-gray-500">{completed}/{total} fields</span>}
      </div>

      {/* Bar */}
      <div className={`${mobile ? "h-2.5" : "h-2"} w-full overflow-hidden rounded-lg bg-gray-100`}>
        <div
          className={`h-full rounded-lg transition-all ${colour.bar}`}
          style={{ width: `${percent}%` }}
          title={`${percent}% filled (${completed}/${total})`}
        />
      </div>

      {/* Mobile: inline breakdown (no hover on touch) */}
      {mobile && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-none">
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Approved {approved}
          </span>
          <span className="flex items-center gap-1 text-blue-600">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            Filled {filled}
          </span>
          <span className="flex items-center gap-1 text-yellow-600">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
            Pending {pending}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            Rejected {rejected}
          </span>
        </div>
      )}

      {/* Desktop: hover tooltip — full status breakdown */}
      {!mobile && (
        <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
          <div className="font-semibold">
            {percent}% filled ({completed}/{total})
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Approved: {approved}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            Filled: {filled}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
            Pending: {pending}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            Rejected: {rejected}
          </div>
          <div className="mt-0.5 border-t border-white/20 pt-0.5 text-gray-300">
            Total: {total}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeOnboardingList() {

  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const employeeId = user?.employee ?? "";
  const company = user?.company ?? "";

  const titles = ["Employee Name", "Department", "Designation", "Date of Joining", "Boarding Begins On", "Status", "Field Progress"];
  const columnWidths = ["1.2fr", "1fr", "1fr", "1fr", "1fr", "0.8fr", "1.6fr"];

  const customAPI =
    employeeId && company
      ? {
        method: "recruitment.api.employee_onboarding.get_employee_onboarding_list",
        params: {},
      }
      : null;

  return (
    <div className="w-full lg:p-4 p-2">
      <div className="sm:mb-4 px-2 mb-2">
        <Typography variant="h4">Employee Onboarding</Typography>
        {isDesktop && (
          <Typography variant="bodySmall" color="body2">
            Track Employee Onboarding History
          </Typography>
        )}
      </div>

      {isDesktop ? (
        /* ================= DESKTOP ================= */
        <CardTable
          titles={titles}
          columnWidths={columnWidths}
          columnSortConfig={ONBOARDING_SORT_CONFIG}
        >
          {!customAPI ? (
            <CardSkeleton />
          ) : (
            <DataListView<UiOnboarding>
              queryKey={["onboarding", employeeId, company]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={false}
              showPagination={true}
              orderBy="name desc"
              SkeletonComponent={CardSkeleton}
              clientFilterFn={(rawData) =>
                mapOnboardingData(rawData as unknown as ApiOnboardingItem[])
              }
              noRecordsScreen={
                <NoDataFound
                  title="No Onboarding Records Found"
                  subtitle="No employee onboarding records available."
                />
              }
              renderItem={(item: UiOnboarding) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/webapp/employee-onboarding/onboarding-field-approval/${item.id}`)}
                  className="grid w-full items-center gap-4 px-6 h-16 border-b border-gray-50 cursor-pointer hover:bg-primary/10"
                  style={{ gridTemplateColumns: columnWidths.join(" ") }}
                >
                  <Typography variant="bodySmall" className="font-medium text-center">
                    {item.employeeName}
                  </Typography>

                  <Typography variant="bodySmall" className="font-medium text-center">
                    {item.department}
                  </Typography>

                  <Typography variant="bodySmall" className="font-medium text-center">
                    {item.designation}
                  </Typography>

                  <Typography variant="bodySmall" className="font-medium text-center">
                    {formatToIndianDate(item.dateOfJoining)}
                  </Typography>

                  <Typography variant="bodySmall" className="font-medium text-center">
                    {formatToIndianDate(item.boardingBeginsOn)}
                  </Typography>

                  <div className="font-medium items-center flex justify-center">
                    <StatusBadge status={item.boardingStatus} />
                  </div>

                  <div className="font-medium items-center flex justify-center">
                    <ApprovalProgressBar
                      approved={item.approved}
                      filled={item.filled}
                      rejected={item.rejected}
                      pending={item.pending}
                      total={item.totalFields}
                      complete={item.boardingStatus === "Completed"}
                    />
                  </div>
                </div>
              )}
            />
          )}
        </CardTable>
      ) : (
        /* ================= MOBILE ================= */
        <>
          {!customAPI ? (
            <CardSkeleton />
          ) : (
            <DataListView<UiOnboarding>
              queryKey={["onboarding", employeeId, company]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={true}
              showPagination={true}
              orderBy="name desc"
              SkeletonComponent={CardSkeleton}
              clientFilterFn={(rawData) =>
                mapOnboardingData(rawData as unknown as ApiOnboardingItem[])
              }
              noRecordsScreen={
                <NoDataFound
                  title="No Onboarding Records Found"
                  subtitle="No employee onboarding records available."
                />
              }
              renderItem={(item: UiOnboarding) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/webapp/employee-onboarding/onboarding-field-approval/${item.id}`)}
                  className="cursor-pointer border-t-4 border-x border-b mt-2
                    border-x-primary/20 border-b-primary/20
                    shadow-sm border-primary bg-white rounded-xl"
                >
                  <div className="p-4 flex flex-col gap-3 w-full">
                    {/* Header: Employee Name + Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel">Employee Name</Typography>
                        <Typography variant="mobileCardValue">{item.employeeName}</Typography>
                      </div>
                      <StatusBadge status={item.boardingStatus} />
                    </div>

                    {/* Department / Designation Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel">Department</Typography>
                        <Typography variant="mobileCardValue">{item.department}</Typography>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Typography variant="mobileCardLabel">Designation</Typography>
                        <Typography variant="mobileCardValue">{item.designation}</Typography>
                      </div>
                    </div>

                    {/* Dates Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel">Date of Joining</Typography>
                        <Typography variant="mobileCardValue">
                          {formatToIndianDate(item.dateOfJoining)}
                        </Typography>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Typography variant="mobileCardLabel">Boarding Begins On</Typography>
                        <Typography variant="mobileCardValue">
                          {formatToIndianDate(item.boardingBeginsOn)}
                        </Typography>
                      </div>
                    </div>

                    <div className="w-full flex flex-col gap-1">
                      <Typography variant="mobileCardLabel">
                        Field Progress
                      </Typography>
                      <ApprovalProgressBar
                        approved={item.approved}
                        filled={item.filled}
                        rejected={item.rejected}
                        pending={item.pending}
                        total={item.totalFields}
                        mobile
                        complete={item.boardingStatus === "Completed"}
                      />
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </>
      )}

      {/* ================= DETAILS MODAL ================= */}

    </div>
  );
}