import DataListView from "../../DataListView";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useMemo, useState } from "react";
import {
  LoadingAction,
  MyPlannedAttendanceRequest,
} from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import CardTable from "../../shared/CardTable";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate } from "react-router-dom";
import { MyRequestCard } from "./MyRequestCard";

const MyOvertimePendingRequests = () => {
  const navigate = useNavigate();
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const [selectedRequest, setSelectedRequest] = useState<
    (MyPlannedAttendanceRequest & { loadingAction?: LoadingAction }) | null
  >(null);
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const defaultFilters = useMemo(
    () => ({
      reference_type: "Planned Overtime Request",
      employee: currentEmployee?.employee,
      status: ["!=", "Open"],
    }),
    [currentEmployee]
  );
  return (
    <div>
      <LayoutHeader
        tab={"My Overtime Requests"}
        onBack={() => {
          navigate(-1);
        }}
      />
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
        <DataListView
          queryKey="planned-overtime-request"
          customAPI={{
            method: "cn_leave_shift_managment.api.get_open_approval_todos",
            params: {
              doctype: "Planned Overtime Request",
              employee: currentEmployee?.employee,
            },
          }}
          defaultFilters={defaultFilters}
          ItemComponent={(props: { item: MyPlannedAttendanceRequest }) => {
            return (
              <MyRequestCard
                request={props?.item}
                onClick={(request: MyPlannedAttendanceRequest) =>
                  setSelectedRequest(request)
                }
              />
            );
          }}
          // SkeletonComponent={CardSkeleton}
          onItemClick={(data) => {
            console.log(data);
          }}
          onRefetchComplete={() => {
            setRefetchAttendance(false);
          }}
          refetchTrigger={refetchAttendance}
          isSearch={false}
          isFilter={false}
          showRefreshButton={false}
          orderBy="modified desc"
          infiniteScroll={false}
          loadMorePagination={true}
          showPagination={false}
        />
        {selectedRequest && (
          <MyOvertimeDetails
            label="Planned Overtime Request"
            data={selectedRequest as MyPlannedAttendanceRequest}
            onClose={() => setSelectedRequest(null)}
          />
        )}
      </CardTable>
    </div>
  );
};

export default MyOvertimePendingRequests;
