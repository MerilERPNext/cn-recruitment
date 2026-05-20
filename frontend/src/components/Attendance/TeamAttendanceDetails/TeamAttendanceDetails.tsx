import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { MyAttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";

import useCurrentUser from "../../../hooks/useCurrentUser";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { BulkSelectProvider } from "../../shared/BulkSelectContext";
import { ColumnSortConfig } from "../../shared/CardTableContext";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import ApprovalCard from "./ApprovalCard";

const TeamAttendanceDetails = () => {
  const { data: currentUser } = useCurrentUser();
  const { isDesktop } = useScreenSize();

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: MyAttendanceRequest) => {
      if (request?.todo_id || request?.reference_name) {
        setSearchParams({
          requestId: request.todo_id,
          reference_name: request.reference_name,
        });
      }
    },
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const tableTitles = isBulkSelectEnabled
    ? [
      "Select",
      "Employee",
      "Explanation",
      "Assigned To",
      "From Date",
      "To Date",
      "Due Date",
      "Status",
      "Actions",
    ]
    : [
      "Employee",
      "Explanation",
      "Assigned To",
      "From Date",
      "To Date",
      "Due Date",
      "Status",
      "Actions",
    ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  const sortableColumns: ColumnSortConfig[] = [
    {
      sortable: true,
      type: "string",
      field: "employee_name",
      getValue: (item) =>
        item.reference_document?.employee_name ??
        item.reference_document?.employee ??
        "",
    },
    {
      sortable: true,
      type: "string",
      field: "explanation",
      getValue: (item) => item.reference_document?.explanation ?? "",
    },
    { sortable: false },
    {
      sortable: true,
      type: "date",
      field: "from_date",
      getValue: (item) => item.reference_document?.from_date ?? "",
    },
    {
      sortable: true,
      type: "date",
      field: "to_date",
      getValue: (item) => item.reference_document?.to_date ?? "",
    },
    {
      sortable: true,
      type: "date",
      field: "due_date",
      getValue: (item) => item.due_date ?? "",
    },
    {
      sortable: false,
    },
    { sortable: false }, // Actions
  ];

  const columnSortConfig = useMemo<ColumnSortConfig[]>(
    () =>
      isBulkSelectEnabled
        ? [{ sortable: false }, ...sortableColumns] // prepend { sortable: false } for "Select" column
        : sortableColumns,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isBulkSelectEnabled],
  );

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Attendance Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team attendance requests
            </Typography>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <BulkSelectProvider>
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths} columnSortConfig={columnSortConfig}>
          {currentUser?.name ? (
            <ApprovalList
              doctype={"Attendance Request"}
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
                  fieldname: "custom_status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    {
                      label: "Pending",
                      value: "Pending",
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
              defaultFilters={{ custom_status: "Pending" }}
              SkeletonComponent={CardSkeleton}
              renderCardContent={(item) => {
                if (
                  item?.data?.custom_selected_doctype_action === "Send Back"
                ) {
                  return null;
                }
                return (
                  <ApprovalCard
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
                    onClick={(request: MyAttendanceRequest) =>
                      handleRequestClick(request)
                    }
                    loadingAction={item?.loadingAction}
                    isBulkSelectEnabled={isBulkSelectEnabled}
                    isActed={item?.isActed}
                  />
                );
              }}
            />
          ) : null}
        </CardTable>
        </BulkSelectProvider>
      </div>
      {(requestId || referenceName) && (
        <AttendanceDetailView
          documentName={requestId || ""}
          referenceName={referenceName || ""}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TeamAttendanceDetails;
