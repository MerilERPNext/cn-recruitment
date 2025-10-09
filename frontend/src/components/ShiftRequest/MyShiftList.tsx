import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useCallback } from "react";
import DataListView from "../DataListView";
import { MyShiftRequest } from "../../types/shift";
import EmpShiftRequestCard from "./EmpShiftRequestCard";

const ShiftRequestList = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name ?? ""
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);

  const CardSkeleton = () => (
    <div className="my-content-card rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-32 bg-gray-300 rounded"></div>
          <div className="h-5 w-16 bg-gray-300 rounded-md"></div>
        </div>
        <div className="h-3 w-48 bg-gray-300 rounded"></div>
      </div>
    </div>
  );


  return (
    <div className="w-full mx-auto pt-2 px-1">

      {currentEmployee?.employee && (
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
          onRefetchComplete={handleRefetchComplete}
          refetchTrigger={refetchAttendance}
          isSearch={false}
          isFilter={false}
          showRefreshButton={false}
          orderBy="modified desc"
          infiniteScroll={true}
          loadMorePagination={true}
          showPagination={false}
        />
      )}
    </div>
  );
};

export default ShiftRequestList;
