import { differenceInCalendarDays } from "date-fns";
import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { MyAttendanceRequest } from "../../../types/attendance";
import DataListView from "../../DataListView";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { ColumnSortConfig } from "../../shared/CardTableContext";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { AttendanceDetailView } from "../AttendanceDetails";
import EmpAttendanceRequestCard from "../Employee/EmpAttendanceRequestCard";
import AttendanceRequestFormV2 from "./AttendanceRequestFormV2";

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: true,
    type: "string",
    field: "name",
    getValue: (item: MyAttendanceRequest) =>
      item.reference_document?.name ?? "",
  },
  {
    sortable: true,
    type: "string",
    field: "custom_request_type",
    getValue: (item: MyAttendanceRequest) =>
      item.reference_document?.custom_request_type ?? "",
  },
  { sortable: false },

  {
    sortable: true,
    type: "date",
    field: "from_date",
    getValue: (item: MyAttendanceRequest) =>
      item.reference_document?.from_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "to_date",
    getValue: (item: MyAttendanceRequest) =>
      item.reference_document?.to_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "due_date",
    getValue: (item: MyAttendanceRequest) => item.due_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "creation",
    getValue: (item: MyAttendanceRequest) => item.reference_document?.creation ?? "",
  },
  {
    sortable: true,
    type: "number",
    field: "duration",
    getValue: (item: MyAttendanceRequest) => {
      const from = item.reference_document?.from_date;
      const to = item.reference_document?.to_date;
      if (!from || !to) return 0;
      return differenceInCalendarDays(new Date(to), new Date(from)) + 1;
    },
  },
  {
    sortable: false,
  },
  { sortable: false },
];

const AttendanceRequest = ({
  pageSize = 10,
  showAttendanceRequest = true,
}: {
  pageSize?: number;
  showAttendanceRequest?: boolean;
}) => {
  const { isDesktop } = useScreenSize();
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployeeId = targetEmployeeId || currentEmployee?.employee;
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);

  const handleRequestClick = useCallback(
    (request: MyAttendanceRequest) => {
      if (request?.todo_id || request?.reference_name) {
        setSearchParams({
          requestId: request.todo_id,
          reference_name: request.reference_name,
        });
      }
    },
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    setRefetchAttendance(true);
  }, [setSearchParams, setRefetchAttendance]);

  const AttendanceItemComponent = useCallback(
    (props: { item: MyAttendanceRequest }) => (
      <EmpAttendanceRequestCard
        type="pending"
        data={props.item}
        onClick={handleRequestClick}
      />
    ),
    [handleRequestClick],
  );

  return (
    <>
      {showForm ? (
        <AttendanceRequestFormV2
          onClose={() => {
            setShowForm(false);
          }}
        />
      ) : (
        <div className="flex flex-col h-full">
          {isDesktop && (
            <div className="flex-shrink-0">
              <div className="px-6 py-1 md:py-4">
                <Typography variant="h4">My Attendance Requests</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your attendance requests
                </Typography>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto md:px-4 pb-20">
            <CardTable
              columnWidths={["1.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "0.8fr", "1fr", "1fr", "1fr", "1fr"]}
              titles={[
                "Request ID",
                "Request Type",
                "Assigned To",
                "From Date",
                "To Date",
                "Due Date",
                "Created At",
                "Duration",
                "Status",
                "Sendback Comment",
                "Actions",
              ]}
              columnSortConfig={COLUMN_SORT_CONFIG}
            >
              {effectiveEmployeeId ? (
                <DataListView
                  queryKey={["attendance-requests", effectiveEmployeeId]}
                  customAPI={{
                    method:
                      "cn_leave_shift_managment.api.get_open_approval_todos",
                    params: {
                      doctype: "Attendance Request",
                      employee: effectiveEmployeeId,
                    },
                  }}
                  ItemComponent={AttendanceItemComponent}
                  SkeletonComponent={CardSkeleton}
                  onRefetchComplete={handleRefetchComplete}
                  refetchTrigger={refetchAttendance}
                  pageSize={pageSize}
                  showRefreshButton={false}
                  infiniteScroll={false}
                  loadMorePagination={false}
                  showPagination={true}
                  isSearch={true}
                  isFilter={true}
                  filterFields={[
                    {
                      fieldname: "custom_status",
                      label: "Status",
                      fieldtype: "Select",
                      options: [
                        {
                          label: "Pending",
                          value: "Pending",
                          customAPIParams: { todo_status: ["in", ["Open", "Closed"]] },
                        },
                        { label: "Approved", value: "Approved" },
                        { label: "Rejected", value: "Rejected" },
                        {
                          label: "Revoked",
                          value: "Revoked",
                          excludeFieldFromFilters: true,
                          customAPIParams: {
                            todo_status: "Cancelled",
                          },
                          additionalFilters: {
                            docstatus: 2,
                            custom_allow_revoke: 1,
                          },
                        },
                      ],
                      emptyValueConfig: {
                        filterValue: ["!=", "Cancelled"],
                      },
                    },
                    {
                      fieldname: "custom_request_type",
                      label: "Request Type",
                      fieldtype: "Select",
                      options: [
                        "Attendance Adjustment",
                        "Short Attendance Request",
                        "Out Duty",
                        "Clockin",
                      ],
                    },
                  ]}
                />
              ) : (
                <></>
              )}
            </CardTable>
          </div>
          {!isDesktop && showAttendanceRequest && (
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2">
              <div className="max-w-7xl mx-auto px-4">
                <Button
                  size="lg"
                  fullWidth
                  className="hover:bg-blue-700"
                  onClick={() => setShowForm(!showForm)}
                >
                  <span>+ Attendance Request</span>
                </Button>
              </div>
            </div>
          )}
          {(requestId || referenceName) && (
            <AttendanceDetailView
              documentName={requestId || ""}
              referenceName={referenceName || ""}
              onClose={handleCloseModal}
              onAction={handleActionComplete}
            />
          )}
        </div>
      )}
    </>
  );
};

export default AttendanceRequest;
