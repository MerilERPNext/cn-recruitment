/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from "react";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import ApprovalList from "../../../shared/ApprovalList";
import { Typography } from "../../../shared/atoms/Typography";
import CardTable from "../../../shared/CardTable";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import ApprovalRejectionLoanList from "../component/TeamApprovallist";
import LoanDetailsModal from "./LoanDetailsView";
import { useSearchParams } from "react-router-dom";

const TeamLoanRequest = () => {
  const { isDesktop } = useScreenSize();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  // Read from URL
  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const [selectedItem, setSelectedItem] = useState<any | null>(null);

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
        "Employee",
        "Loan Type",
        "Loan Amount",
        "Rate of Interest",
        "Standard Interest",
        "Start Date",
        "End Date",
        "Status",
        "ACTIONS",
      ]
    : [
        "Employee",
        "Loan Type",
        "Loan Amount",
        "Rate of Interest",
        "Standard Interest",
        "Start Date",
        "End Date",
        "Status",
        "ACTIONS",
      ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Loan Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team loan requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
          <ApprovalList
            status="Open"
            doctype="Loan Application"
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
                    key: "Open",
                    value: "Open",
                    customAPIParams: { todo_status: "Open" }
                  },
                  {
                    label: "Approved",
                    key: "Approved",
                    value: ["in", ["Draft", "Approved", "Open", "Pending"]],
                    customAPIParams: { todo_status: "Closed" }
                  },
                  {
                    label: "Rejected",
                    key: "Rejected",
                    value: "Rejected"
                  },
                ],
                emptyValueConfig: {
                  filterValue: ["!=", "Cancelled"]
                }
              },
            ]}
            defaultFilters={{ status: "Open"}}
            SkeletonComponent={CardSkeleton}
            renderCardContent={(item: any) => {
              if (item?.data?.custom_selected_doctype_action === "Send Back") {
                return null;
              }
              return <ApprovalRejectionLoanList
                data={item.data}
                isSelected={item.isSelected}
                onToggleSelect={item.onToggleSelect}
                onAction={item.onAction}
                loadingAction={item.loadingAction}
                onClick={() => handleRequestClick(item)}
                isBulkSelectEnabled={isBulkSelectEnabled}
              />
            }}
          />
        </CardTable>
      </div>

      {/* MODAL — opens on row click OR direct URL */}
      <LoanDetailsModal
        documentName={requestId || ""}
        referenceName={referenceName || ""}
        open={isModalOpen}
        item={selectedItem}   // null when opened via direct URL — modal fetches data itself
        onClose={handleClose}
      />
    </div>
  );
};

export default TeamLoanRequest;