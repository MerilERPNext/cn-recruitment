import { MyAttendanceRequest } from "../../../../types/attendance";
import EmpAttendanceRequestCard from "../EmpAttendanceRequestCard";
import DataListView from "../../../DataListView";
import CardSkeletons from "./CardSkeletons";

type prop = {
  currentEmployee?:
    | {
        employee?: string;
      }
    | undefined;
  refetchAttendance?: boolean;
  setRefetchAttendance: (val: boolean) => void;
};
const CardTablee: React.FC<prop> = ({
  currentEmployee,
  refetchAttendance,
  setRefetchAttendance,
}) => {
  const CardSkeleton = () => <CardSkeletons />;

  return (
    <>
      {currentEmployee?.employee ? (
        <DataListView
          queryKey="attendance-requests"
          customAPI={{
            method: "cn_leave_shift_managment.api.get_open_approval_todos",
            params: {
              doctype: "Attendance Request",
              employee: currentEmployee?.employee,
            },
          }}
          defaultFilters={{
            status: "Pending",
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
          orderBy="modified desc"
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

export default CardTablee;
