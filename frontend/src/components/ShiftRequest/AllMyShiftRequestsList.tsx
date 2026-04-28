import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import { useScreenSize } from "../../hooks/useScreenSize";
import { MyShiftRequest } from "../../types/shift";
import DataListView from "../DataListView";
import HeaderBar from "../HeaderBar";
import CardTable, { ColumnSortConfig } from "../shared/CardTable";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import EmpShiftRequestCard from "./EmpShiftRequestCard";

const COLUMN_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: true,
    type: "string",
    field: "shift_type",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.shift_type ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "from_date",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.from_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "to_date",
    getValue: (item: MyShiftRequest) =>
      item.reference_document?.to_date ?? "",
  },
  {
    sortable: false,
  },
  { sortable: false },
];


const AllMyShiftRequestsList = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const { data: currentEmployee } = useCurrentEmployeeAllDetails();
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
          columnSortConfig={COLUMN_SORT_CONFIG}
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
              defaultFilters={{ status: ["!=", "Cancelled"] }}
              pageSize={10}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
            />
          ) : null}
        </CardTable>
      </div>
    </div>
  );
};

export default AllMyShiftRequestsList;
