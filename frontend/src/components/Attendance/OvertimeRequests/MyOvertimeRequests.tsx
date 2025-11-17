import { useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import { useNavigate, useSearchParams } from "react-router";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import { MyRequestCard } from "./MyRequestCard";
import CustomDropdown from "../../shared/CustomDropdown";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Open" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const MyOvertimeRequests = () => {
  const [refetchMyRequestsList, setRefetchMyRequestsList] = useState(false);
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const [selectedStatus, setSelectedStatus] = useState("Open");

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
    setRefetchMyRequestsList(true);
  };

  const handleMyRequestsRefetchComplete = useCallback(() => {
    setRefetchMyRequestsList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: MyPlannedAttendanceRequest) => {
      console.log("Request clicked:", request);
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

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <CustomDropdown
        value={selectedStatus}
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
      />
    </div>
  );

  return (
    <div>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2 mt-4">
          <div>
            <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200 px-2">
              <h2 className="module-title pb-1">My Overtime Requests</h2>
              <div className="flex items-center space-x-3 pb-1">
                <FilterDropdowns />
              </div>
            </div>
            <CardTable
              columnWidths={["1fr", "2fr", "1fr", "1fr", "1fr"]}
              titles={[
                "Allocated To",
                "Description",
                "Creation",
                "Due Date",
                "Status",
              ]}
            >
              {currentEmployee?.employee ? (
                <DataListView
                  queryKey="planned-overtime-request"
                  customAPI={{
                    method:
                      "cn_leave_shift_managment.api.get_open_approval_todos",
                    params: {
                      doctype: "Planned Overtime Request",
                      employee: currentEmployee?.employee,
                      status: selectedStatus,
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
                  refetchTrigger={refetchMyRequestsList}
                  isSearch={false}
                  isFilter={false}
                  pageSize={10}
                  showRefreshButton={false}
                  orderBy="modified desc"
                  infiniteScroll={false}
                  loadMorePagination={true}
                  showPagination={true}
                />
              ) : null}
            </CardTable>
          </div>
        </div>
      </div>

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
