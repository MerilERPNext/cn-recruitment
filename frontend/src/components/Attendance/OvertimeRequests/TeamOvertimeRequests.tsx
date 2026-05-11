import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { BulkSelectProvider } from "../../shared/BulkSelectContext";
import { ColumnSortConfig } from "../../shared/CardTableContext";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import OvertimeApprovalCard from "./OvertimeApprovalCard";

const TeamOvertimeRequests = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const { data: currentUser } = useCurrentUser();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: MyPlannedAttendanceRequest) => {
      if (request?.todo_id) {
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
    ? ["Select", "Employee", "Description", "Assigned To", "Due Date", "Status", "Actions"]
    : ["Employee", "Description", "Assigned To", "Due Date", "Status", "Actions"];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1.5fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1.5fr", '1fr', "1fr", "1fr", "1fr"];

  const sortableColumns: ColumnSortConfig[] = [
    {
      sortable: true,
      type: "string",
      field: "employee_name",
      getValue: (item: MyPlannedAttendanceRequest) =>
        item.reference_document?.employee_name ??
        item.reference_document?.employee ??
        "",
    },
    {
      sortable: true,
      type: "string",
      field: "description",
      getValue: (item: MyPlannedAttendanceRequest) => item.description ?? "",
    },
    {
      sortable: true,
      type: "date",
      field: "due_date",
      getValue: (item: MyPlannedAttendanceRequest) => String(item.due_date ?? ""),
    },
    {
      sortable: false,
    },
    { sortable: false },
    { sortable: false }, // Actions
  ];

  const columnSortConfig = useMemo<ColumnSortConfig[]>(
    () =>
      isBulkSelectEnabled
        ? [{ sortable: false }, ...sortableColumns]
        : sortableColumns,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isBulkSelectEnabled],
  );

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Overtime Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team overtime requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <BulkSelectProvider>

          <CardTable titles={tableTitles} columnWidths={tableColumnWidths} columnSortConfig={columnSortConfig}>
            {currentUser?.name && (
              <ApprovalList
                doctype="Planned Overtime Request"
                pageSize={10}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                infiniteScroll={false}
                loadMorePagination={false}
                showPagination={true}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
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
                        key: "Open",
                        value: "Open",
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
                SkeletonComponent={CardSkeleton}
                defaultFilters={{ status: "Open" }}
                renderCardContent={(item) => {
                  if (
                    item?.data?.custom_selected_doctype_action === "Send Back"
                  ) {
                    return null;
                  }
                  return (
                    <OvertimeApprovalCard
                      isSelected={item?.isSelected}
                      onToggleSelect={item?.onToggleSelect}
                      data={item?.data}
                      onAction={item?.onAction}
                      onClick={(request: MyPlannedAttendanceRequest) =>
                        handleRequestClick(request)
                      }
                      loadingAction={item?.loadingAction}
                      isBulkSelectEnabled={isBulkSelectEnabled}
                      isActed={item?.isActed}
                    />
                  );
                }}
              />
            )}
          </CardTable>
        </BulkSelectProvider>
      </div>
      {(requestId || referenceName) && (
        <MyOvertimeDetails
          documentName={requestId || ""}
          referenceName={referenceName || ""}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
          type="team"
        />
      )}
    </div>
  );
};

export default TeamOvertimeRequests;
