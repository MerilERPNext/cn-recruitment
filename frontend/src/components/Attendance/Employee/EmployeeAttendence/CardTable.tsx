import { MyAttendanceRequest } from "../../../../types/attendance";
import EmpAttendanceRequestCard from "../EmpAttendanceRequestCard";
import DataListView from "../../../DataListView";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import NoDataFound from "../../../shared/atoms/NoDataFound";

type prop = {
  currentEmployee?:
  | {
    employee?: string;
  }
  | undefined;
  refetchAttendance?: boolean;
  setRefetchAttendance: (val: boolean) => void;
};
const Cardtable: React.FC<prop> = ({
  currentEmployee,
  refetchAttendance,
  setRefetchAttendance,
}) => {
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployeeId = targetEmployeeId || currentEmployee?.employee;

  return (
      <DataListView
        queryKey={[
          "attendance-requests",
          "calendar-page",
          effectiveEmployeeId || "no-employee",
        ]}
        customAPI={
          effectiveEmployeeId
            ? {
                method: "cn_leave_shift_managment.api.get_open_approval_todos",
                params: {
                  doctype: "Attendance Request",
                  employee: effectiveEmployeeId,
                },
              }
            : undefined
        }
        fetchFunction={
          !effectiveEmployeeId
            ? async () => ({ message: [], data: [] } as any)
            : undefined
        }
        noRecordsScreen={
          <NoDataFound
            title="No Attendance Requests"
            subtitle="There are no attendance requests matching your criteria."
          />
        }
        ItemComponent={(props: { item: MyAttendanceRequest }) => {
            return (
              <EmpAttendanceRequestCard
                type="pending"
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
          onRefetchComplete={() => {
            setRefetchAttendance(false);
          }}
          refetchTrigger={refetchAttendance}
          isSearch={false}
          isFilter={false}
          pageSize={5}
          showRefreshButton={false}
          infiniteScroll={false}
          loadMorePagination={true}
          showPagination={false}
        />
  );
};

export default Cardtable;
