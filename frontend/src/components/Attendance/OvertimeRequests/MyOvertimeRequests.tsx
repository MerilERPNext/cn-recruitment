import { useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import { useNavigate, useSearchParams } from "react-router";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import { MyRequestCard } from "./MyRequestCard";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import Button from "../../shared/atoms/Button";
import { Plus } from "lucide-react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CreateOvertimeRequest from "./CreateOvertimeRequest";
import { usePlannedOvertimeAllowed } from "../../../hooks/useAttendance";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import { Typography } from "../../shared/atoms/Typography";

const MyOvertimeRequests = () => {
  const [refetchMyRequestsList, setRefetchMyRequestsList] = useState(false);
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { isDesktop } = useScreenSize();

  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployeeId = targetEmployeeId || currentEmployee?.employee;

  const { data: plannedOvertimAllowed } = usePlannedOvertimeAllowed(
    currentEmployee?.employee || ""
  );
  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canRequestAttendance = isActionEnabled(
    userUiPermission,
    "create_overtime_request",
    "My Overtime"
  );

  const [showForm, setShowForm] = useState(false);

  const handleMyRequestsRefetchComplete = useCallback(() => {
    setRefetchMyRequestsList(false);
    setRefetchAttendance(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: MyPlannedAttendanceRequest) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id });
      }
    },
    [setSearchParams]
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return (
    <div>
      <div className="min-h-screen">
        <div className="px-4">
          <div>
            <div className="flex justify-between items-center pt-4 mb-2 border-b border-gray-200 px-2">
              <div className="flex flex-col mb-2">
                <Typography variant="h4">My Overtime Requests</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your overtime requests
                </Typography>
              </div>
            </div>
            <CardTable
              columnWidths={["2fr", "1fr", "1fr", "1fr", "1fr"]}
              titles={[
                "Description",
                "Creation",
                "Due Date",
                "Allocated To",
                "Status",
              ]}
            >
              {effectiveEmployeeId ? (
                <DataListView
                  queryKey={["planned-overtime-request", effectiveEmployeeId]}
                  customAPI={{
                    method:
                      "cn_leave_shift_managment.api.get_open_approval_todos",
                    params: {
                      doctype: "Planned Overtime Request",
                      employee: effectiveEmployeeId,
                      status: "Open",
                    },
                  }}
                  ItemComponent={(props: {
                    item: MyPlannedAttendanceRequest;
                  }) => {
                    return (
                      <MyRequestCard
                        request={props?.item}
                        onClick={(request: MyPlannedAttendanceRequest) =>
                          handleRequestClick(request)
                        }
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
                      options: ["Open", "Approved", "Rejected"],
                    },
                  ]}
                  pageSize={10}
                  showRefreshButton={false}
                  orderBy="modified desc"
                  showPagination={true}
                  infiniteScroll={true}
                  loadMorePagination={false}
                />
              ) : null}
            </CardTable>
          </div>
        </div>
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
              <Plus /> <span>Add Overtime Request</span>
            </Button>
          </div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CreateOvertimeRequest onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}
      {requestId && (
        <MyOvertimeDetails
          documentName={requestId}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default MyOvertimeRequests;
