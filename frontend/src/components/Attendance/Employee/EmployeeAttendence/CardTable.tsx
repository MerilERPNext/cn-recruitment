import { MyAttendanceRequest } from "../../../../types/attendance";
import EmpAttendanceRequestCard from "../EmpAttendanceRequestCard";
import DataListView from "../../../DataListView";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";

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
    <>
      {effectiveEmployeeId ? (
        <DataListView
          queryKey={[
            "attendance-requests",
            "pending",
            "calendar-page",
            effectiveEmployeeId,
          ]}
          customAPI={{
            method: "cn_leave_shift_managment.api.get_open_approval_todos",
            params: {
              doctype: "Attendance Request",
              employee: effectiveEmployeeId,
            },
          }}
          defaultFilters={{
            custom_status: "Pending",
          }}
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
      ) : (
        <></>
      )}
    </>
  );
};

export default Cardtable;
