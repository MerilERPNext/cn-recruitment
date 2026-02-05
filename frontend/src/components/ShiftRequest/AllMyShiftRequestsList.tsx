import { useNavigate } from "react-router-dom";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import CardTable from "../shared/CardTable";
import DataListView from "../DataListView";
import EmpShiftRequestCard from "./EmpShiftRequestCard";
import { MyShiftRequest } from "../../types/shift";
import HeaderBar from "../HeaderBar";
import { useCallback } from "react";

const AllMyShiftRequestsList = () => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name ?? "",
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);

  const CardSkeleton = () => (
    <div className="my-content-card rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full mx-auto py-4 px-4">
      <HeaderBar
        title="My Shift Requests"
        className="mb-3"
        onBack={() => navigate(-1)}
      />
      <CardTable
        titles={["Shift Type", "From Date", "To Date", "Status", "Actions"]}
      >
        {currentEmployee?.employee ? (
          <DataListView
            queryKey="shift-requests"
            customAPI={{
              method: "cn_leave_shift_managment.api.get_open_approval_todos",
              params: {
                doctype: "Shift Request",
                employee: currentEmployee?.employee,
              },
            }}
            ItemComponent={(props: { item: MyShiftRequest }) => {
              return (
                <EmpShiftRequestCard
                  data={{
                    ...props?.item,
                  }}
                />
              );
            }}
            SkeletonComponent={CardSkeleton}
            onItemClick={(data) => {
              console.log(data);
            }}
            onRefetchComplete={handleRefetchComplete}
            refetchTrigger={refetchAttendance}
            isSearch={false}
            isFilter={false}
            showRefreshButton={false}
            orderBy="modified desc"
            infiniteScroll={false}
            loadMorePagination={true}
            showPagination={false}
          />
        ) : null}
      </CardTable>
    </div>
  );
};

export default AllMyShiftRequestsList;
