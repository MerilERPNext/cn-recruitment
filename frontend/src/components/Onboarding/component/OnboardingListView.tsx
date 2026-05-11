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
import { ChevronLeft, ChevronRight } from "lucide-react";


// ─── Raw API shape ────────────────────────────────────────────────────────────
interface ApiOnboardingItem {
  name: string;
  employee_name: string;
  job_applicant: string;
  employee: string | null;
  department: string | null;
  designation: string | null;
  date_of_joining: string;
  boarding_begins_on: string;
  boarding_status: string;
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
  return rawData.map((item) => ({
    id: item.name,
    employeeName: item.employee_name ?? "—",
    jobApplicant: item.job_applicant ?? "—",
    employee: item.employee ?? "—",
    department: item.department ?? "—",
    designation: item.designation ?? "—",
    dateOfJoining: item.date_of_joining ?? "—",
    boardingBeginsOn: item.boarding_begins_on ?? "—",
    boardingStatus: item.boarding_status ?? "—",
    details: {
      referenceNo: item.name,
      employeeName: item.employee_name ?? "—",
      jobApplicant: item.job_applicant ?? "—",
      employee: item.employee ?? "—",
      department: item.department ?? "—",
      designation: item.designation ?? "—",
      dateOfJoining: item.date_of_joining ?? "—",
      boardingBeginsOn: item.boarding_begins_on ?? "—",
      boardingStatus: item.boarding_status ?? "—",
    },
  }));
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

export default function EmployeeOnboardingList() {

  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const employeeId = user?.employee ?? "";
  const company = user?.company ?? "";

  const titles = ["Employee Name", "Department", "Designation", "Date of Joining", "Boarding Begins On", "Status", "Action"];
  const columnWidths = ["1.2fr", "1fr", "1fr", "1fr", "1fr", "0.8fr", "0.8fr"];

  const customAPI =
    employeeId && company
      ? {
        method: "recruitment.api.employee_onboarding.get_employee_onboarding_list",
        params: {},
      }
      : null;

  return (
    <div className="w-full lg:p-4 p-2">
      <div className="sm:mb-4 px-2 mb-2 flex items-center gap-3">
        {!isDesktop && (
          <button
            onClick={() => navigate("/webapp")}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
        )}
        <div>
          <Typography variant="h4">Employee Onboarding</Typography>
          {isDesktop && (
            <Typography variant="bodySmall" color="body2">
              Track Employee Onboarding History
            </Typography>
          )}
        </div>
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
                  className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 cursor-pointer hover:bg-primary/10"
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
                  className="cursor-pointer bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all mb-3 overflow-hidden"
                >
                  <div className="p-4 space-y-4">
                    {/* Header: Employee Name + Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                          {item.employeeName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <Typography variant="mobileCardLabel" className="text-gray-400">Employee Name</Typography>
                          <Typography variant="mobileCardValue" className="text-gray-900 font-bold">{item.employeeName}</Typography>
                        </div>
                      </div>
                      <StatusBadge status={item.boardingStatus} />
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                      <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel" className="text-gray-400">Department</Typography>
                        <Typography variant="mobileCardValue" className="text-gray-800 text-xs font-medium">{item.department}</Typography>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Typography variant="mobileCardLabel" className="text-gray-400">Designation</Typography>
                        <Typography variant="mobileCardValue" className="text-gray-800 text-xs font-medium text-right">{item.designation}</Typography>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel" className="text-gray-400">Joining Date</Typography>
                        <Typography variant="mobileCardValue" className="text-gray-800 text-xs font-medium">
                          {formatToIndianDate(item.dateOfJoining)}
                        </Typography>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Typography variant="mobileCardLabel" className="text-gray-400">Boarding Starts</Typography>
                        <Typography variant="mobileCardValue" className="text-gray-800 text-xs font-medium text-right">
                          {formatToIndianDate(item.boardingBeginsOn)}
                        </Typography>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Footer */}
                  <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-t border-gray-100">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Ref: {item.id}</span>
                    <div className="flex items-center gap-1 text-primary-600 font-bold text-xs">
                      View Details
                      <ChevronRight className="w-3 h-3" />
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