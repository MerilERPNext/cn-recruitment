import { useMemo, useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import { useNavigate, useSearchParams } from "react-router";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import DataListView from "../../DataListView";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import { MyRequestCard } from "./MyRequestCard";

const MyOvertimeRequests = () => {
  const [refetchMyRequestsList, setRefetchMyRequestsList] = useState(false);
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const defaultFilters = useMemo(
    () => ({
      reference_type: "Planned Overtime Request",
      employee: currentEmployee?.employee,
    }),
    [currentEmployee]
  );

  const handleMyRequestsRefetchComplete = useCallback(() => {
    setRefetchMyRequestsList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: any) => {
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

  return (
    <div>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2 mt-4">
          <div>
            <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
              <h2 className="module-title pb-1">My Overtime Requests</h2>
            </div>
            <CardTable
              columnWidths={["10%", "30%", "10%", "10%", "33%"]}
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
                    },
                  }}
                  defaultFilters={defaultFilters}
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
                  // pageSize={5}
                  showRefreshButton={false}
                  orderBy="modified desc"
                  infiniteScroll={false}
                  loadMorePagination={true}
                  showPagination={false}
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
