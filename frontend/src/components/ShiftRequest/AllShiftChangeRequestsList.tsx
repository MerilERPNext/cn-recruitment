/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate, useSearchParams } from "react-router-dom";
import HeaderBar from "../HeaderBar";

import { useCallback, useMemo, useState } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import ApprovalList from "../shared/ApprovalList";
import CardTable, { ColumnSortConfig } from "../shared/CardTable";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import ApprovalRejectionQueue from "./dashboard/ApprovalRejection";
import { ShiftDetailView } from "./ShiftDetailView";
import { MyShiftRequest } from "../../types/shift";

const BASE_COLUMN_SORT_CONFIG_TEAM: ColumnSortConfig[] = [
  { sortable: false },
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
    sortable: true,
    type: "date",
    field: "due_date",
    getValue: (item: MyShiftRequest) => item?.due_date ?? "",
  },
  { sortable: false },
  { sortable: false },
];

const AllShiftChangeRequestsList: React.FC = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id || request?.reference_name) {
        const params: Record<string, string> = {};
        if (request?.todo_id) params.requestId = request.todo_id;
        if (request?.reference_name)
          params.reference_name = request.reference_name;
        setSearchParams(params);
      }
    },
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    // Trigger refetch after action
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const tableTitles = isBulkSelectEnabled
    ? [
      "Select",
      "Employee",
      "Shift Type",
      "From Date",
      "To Date",
      "Due Date",
      "Status",
      "Actions",
    ]
    : [
      "Employee",
      "Shift Type",
      "From Date",
      "To Date",
      "Due Date",
      "Status",
      "Actions",
    ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  const columnSortConfig = useMemo<ColumnSortConfig[]>(
    () =>
      isBulkSelectEnabled
        ? [{ sortable: false }, ...BASE_COLUMN_SORT_CONFIG_TEAM]
        : BASE_COLUMN_SORT_CONFIG_TEAM,
    [isBulkSelectEnabled],
  );

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-4 py-1 md:py-4">
            <HeaderBar
              title="Team Shift Requests"
              onBack={() => navigate(-1)}
              className="shadow"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable
          titles={tableTitles}
          columnWidths={tableColumnWidths}
          columnSortConfig={columnSortConfig}
        >
          <ApprovalList
            doctype={"Shift Request"}
            refetch={refetchApprovalList}
            setRefetch={setRefetchApprovalList}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            pageSize={10}
            infiniteScroll={false}
            loadMorePagination={false}
            showPagination={true}
            isSearch={true}
            isFilter={true}
            columnWidths={tableColumnWidths}
            onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
            filterFields={[
              {
                fieldname: "status",
                label: "Status",
                fieldtype: "Select",
                options: [
                  {
                    label: "Pending",
                    key: "Draft",
                    value: "Draft",
                    customAPIParams: { todo_status: "Open" },
                  },
                  {
                    label: "Approved",
                    key: "Approved",
                    value: ["in", ["Draft", "Approved", "Open", "Pending"]],
                    customAPIParams: { todo_status: "Closed" },
                  },
                  {
                    label: "Rejected",
                    key: "Rejected",
                    value: "Rejected",
                  },
                ],
                emptyValueConfig: {
                  filterValue: ["!=", "Cancelled"],
                },
              },
            ]}
            defaultFilters={{ status: "Draft" }}
            SkeletonComponent={CardSkeleton}
            renderCardContent={(item) => {
              if (item?.data?.custom_selected_doctype_action === "Send Back") {
                return null;
              }
              return (
                <ApprovalRejectionQueue
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(request: any) => handleRequestClick(request)}
                  loadingAction={item?.loadingAction}
                  isBulkSelectEnabled={isBulkSelectEnabled}
                />
              );
            }}
          />
        </CardTable>
      </div>

      {(requestId || referenceName) && (
        <ShiftDetailView
          documentName={requestId || ""}
          referenceName={referenceName || undefined}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default AllShiftChangeRequestsList;
