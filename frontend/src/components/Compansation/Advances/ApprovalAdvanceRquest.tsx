/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import AdvanceDetailsModal from "./Component/AdvanceViewDetailsModel";
import ApprovalRejectionAdvanceList from "./Component/ApprovalAdvanceList";
import { BulkSelectProvider } from "../../shared/BulkSelectContext";

const TeamAdvanceRequest = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const { isDesktop } = useScreenSize();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const uiPermission = {
    app: "Compensation",
    page: "Team Advances",
    actionKey: "actions_enabled",
  };
  const { data: uiPermissionData } = useGetUiPermission(uiPermission?.app);
  const actionsEnabled = isActionEnabled(
    uiPermissionData,
    uiPermission?.actionKey ?? "",
    uiPermission?.page,
  );

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: any) => {
      const data = request?.data || request;
      const todoId = data?.todo_id || request?.todo_id;
      const refName = data?.reference_name || request?.reference_name;

      if (todoId || refName) {
        setSearchParams({
          ...(todoId ? { requestId: todoId } : {}),
          ...(refName ? { reference_name: refName } : {}),
        });
        setSelectedItem(request);
      }
    },
    [setSearchParams],
  );

  // 👉 Close: clear URL params AND selectedItem
  const handleClose = useCallback(() => {
    setSelectedItem(null);
    setSearchParams({});
  }, [setSearchParams]);

  // Modal is open if EITHER a row was clicked OR URL already has an ID (direct URL open)
  const isModalOpen = !!selectedItem || !!(requestId || referenceName);
  const tableTitles = isBulkSelectEnabled
    ? [
      "Select",
      "Employee Name",
      "Advance Type",
      "Amount",
      "Start Date",
      "End Date",
      "Status",
      "Sendback Comment",
      "Actions",
    ]
    : [
      "Employee Name",
      "Advance Type",
      "Amount",
      "Start Date",
      "End Date",
      "Status",
      "Sendback Comment",
      "Actions",
    ];

  const PERQUISITE_SORT_CONFIG: ColumnSortConfig[] = [
    {
      sortable: false, // Select checkbox
    },
    {
      sortable: true,
      type: "string",
      field: "employee_name",
      getValue: (item: any) =>
        item?.reference_document?.employee_name ?? "",
    },
    {
      sortable: true,
      type: "string",
      field: "advance_type",
      getValue: (item: any) =>
        item?.reference_document?.custom_advance_type ?? "",
    },
    {
      sortable: true,
      type: "number",
      field: "amount",
      getValue: (item: any) =>
        item?.reference_document?.advance_amount ?? 0,
    },
    {
      sortable: true,
      type: "date",
      field: "start_date",
      getValue: (item: any) =>
        item?.reference_document?.custom_repayment_start_date ?? "",
    },
    {
      sortable: true,
      type: "date",
      field: "posting_date",
      getValue: (item: any) =>
        item?.reference_document?.posting_date ?? "",
    },
    {
      sortable: true,
      type: "string",
      field: "status",
      getValue: (item: any) =>
        item?.reference_document?.status ?? "",
    },
    {
      sortable: false, // Actions
    },
  ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0 px-2">
          <div className="px-4 py-1 md:py-4">
            <Typography variant="h4">Team Advance Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team advance requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <BulkSelectProvider>
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths} columnSortConfig={PERQUISITE_SORT_CONFIG}>
            <ApprovalList
              status="Pending"
              doctype={"Employee Advance"}
              pageSize={10}
              refetch={refetchApprovalList}
              setRefetch={setRefetchApprovalList}
              onApprovalRefetchComplete={handleApprovalRefetchComplete}
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
                      key: "Pending",
                      value: "Pending",
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
              bulkSelectVisible={actionsEnabled}
              SkeletonComponent={CardSkeleton}
              renderCardContent={(item: any) => {
                if (item?.data?.custom_selected_doctype_action === "Send Back") {
                  return null;
                }
                return (
                  <ApprovalRejectionAdvanceList
                    actionsEnabled={actionsEnabled}
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
                    onClick={() => handleRequestClick(item)}
                    loadingAction={item?.loadingAction}
                    isBulkSelectEnabled={isBulkSelectEnabled}
                    isActed={item?.isActed}
                  />
                );
              }}
            />
          </CardTable>
        </BulkSelectProvider>

      </div>

      <AdvanceDetailsModal
        documentName={requestId || ""}
        referenceName={referenceName || ""}
        open={isModalOpen}
        item={selectedItem} // null when opened via direct URL — modal fetches data itself
        onClose={handleClose}
        actionsEnabled={actionsEnabled}
      />
    </div>
  );
};

export default TeamAdvanceRequest;