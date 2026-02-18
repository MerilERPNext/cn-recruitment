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
import { useScreenSize } from "../../hooks/useScreenSize";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";

const AllMyShiftRequestsList = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name ?? "",
  );
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const handleRefetchComplete = useCallback(() => {
    setRefetchAttendance(false);
  }, [setRefetchAttendance]);

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-4 py-1 md:py-4">
            <HeaderBar
              title="My Shift Requests"
              onBack={() => navigate(-1)}
              className="shadow"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable
          titles={["Shift Type", "From Date", "To Date", "Status", "Actions"]}
          columnWidths={["1fr 1fr 1fr  1fr 1fr"]}
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
              showRefreshButton={false}
              orderBy="from_date desc"
              isSearch={true}
              isFilter={true}
              filterFields={[
                {
                  fieldname: "status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    { label: "Pending", value: "Draft" },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },
                  ],
                },
              ]}
              defaultFilters={{
                status: "Draft",
              }}
              pageSize={10}
              showPagination={true}
              infiniteScroll={true}
              loadMorePagination={false}
            />
          ) : null}
        </CardTable>
      </div>
    </div>
  );
};

export default AllMyShiftRequestsList;
