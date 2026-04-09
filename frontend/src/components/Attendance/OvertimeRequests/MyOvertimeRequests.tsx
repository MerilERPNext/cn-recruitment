import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { usePlannedOvertimeAllowed } from "../../../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import { isActionEnabled } from "../../../utils/uiPermission";
import DataListView from "../../DataListView";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { ColumnSortConfig } from "../../shared/CardTableContext";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import CreateOvertimeRequest from "./CreateOvertimeRequest";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import { MyRequestCard } from "./MyRequestCard";

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: true,
    type: "string",
    field: "description",
    getValue: (item: MyPlannedAttendanceRequest) => item.description ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "creation",
    getValue: (item: MyPlannedAttendanceRequest) =>
      item.reference_document?.creation ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "due_date",
    getValue: (item: MyPlannedAttendanceRequest) =>
      String(item.due_date ?? ""),
  },
  {
    sortable: false,
  },
  { sortable: false }, // Actions
];

const MyOvertimeRequests = () => {
  const [refetchMyRequestsList, setRefetchMyRequestsList] = useState(false);
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { isDesktop } = useScreenSize();

  const navigate = useNavigate();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    fields: ["employee"],
  });
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployeeId = targetEmployeeId || currentEmployee?.employee;

  const { data: plannedOvertimAllowed } = usePlannedOvertimeAllowed(
    effectiveEmployeeId || "",
  );
  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canRequestAttendance = isActionEnabled(
    userUiPermission,
    "create_overtime_request",
    "Planned Overtime",
  );

  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MyPlannedAttendanceRequest | null>(null);

  const handleMyRequestsRefetchComplete = useCallback(() => {
    setRefetchMyRequestsList(false);
    setRefetchAttendance(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const handleRequestClick = useCallback(
    (request: MyPlannedAttendanceRequest) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id, reference_name: request.reference_name });
      }
    },
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleEditRequest = useCallback((request: MyPlannedAttendanceRequest) => {
    setEditingRequest(request);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingRequest(null);
  }, []);

  const handleRevokeComplete = useCallback(() => {
    setRefetchMyRequestsList(true);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">My Overtime Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage your overtime requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-20">
        <CardTable
          columnWidths={["1.5fr", "1fr", "1fr", "1fr", "0.5fr"]}
          titles={["Description", "Creation", "Due Date", "Status", "Actions"]}
          columnSortConfig={COLUMN_SORT_CONFIG}
        >
          {effectiveEmployeeId ? (
            <DataListView
              queryKey={["planned-overtime-request", effectiveEmployeeId]}
              customAPI={{
                method: "cn_leave_shift_managment.api.get_open_approval_todos",
                params: {
                  doctype: "Planned Overtime Request",
                  employee: effectiveEmployeeId,
                },
              }}
              ItemComponent={(props: { item: MyPlannedAttendanceRequest }) => {
                return (
                  <MyRequestCard
                    request={props?.item}
                    onClick={(request: MyPlannedAttendanceRequest) =>
                      handleRequestClick(request)
                    }
                    onEdit={handleEditRequest}
                    onActionComplete={handleRevokeComplete}
                  />
                );
              }}
              onRefetchComplete={handleMyRequestsRefetchComplete}
              refetchTrigger={refetchMyRequestsList || refetchAttendance}
              isSearch={true}
              isFilter={true}
              filterFields={[
                {
                  fieldname: "status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    { label: "Pending", value: "Open" },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },
                  ],
                },
              ]}
              defaultFilters={{ status: ["!=", "Cancelled"] }}
              SkeletonComponent={CardSkeleton}
              pageSize={10}
              showRefreshButton={false}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
            />
          ) : null}
        </CardTable>
      </div>

      {!isDesktop && plannedOvertimAllowed && canRequestAttendance && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2">
          <div className="max-w-7xl mx-auto px-4">
            <Button
              size="lg"
              fullWidth
              className="hover:bg-blue-700"
              onClick={() => setShowForm(!showForm)}
            >
              <span>+ Overtime Request</span>
            </Button>
          </div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CreateOvertimeRequest
              onCancel={handleCloseForm}
              isEditMode={!!editingRequest}
              editData={editingRequest ? {
                name: editingRequest.reference_name,
                overtime_details: editingRequest.reference_document?.overtime_details || [],
                attachments: editingRequest.attachments || []
              } : undefined}
            />
          </div>
        </div>
      )}
      {(requestId || referenceName) && (
        <MyOvertimeDetails
          documentName={requestId || ""}
          referenceName={referenceName || ""}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default MyOvertimeRequests;
