/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { useNavigate, useSearchParams } from "react-router-dom";
import ApprovalList from "../../../shared/ApprovalList";
import { Typography } from "../../../shared/atoms/Typography";
import CardTable from "../../../shared/CardTable";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import ApprovalRejectionLoanList from "../component/TeamApprovallist";
import LoanDetailsModal from "./LoanDetailsView";

const TeamLoanRequest = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

const handleRequestClick = useCallback((item: any) => {
  const todo_id = item?.data?.todo_id || item?.data?.name;
  const document_name = item?.data?.reference_document?.name || item?.data?.name || "";
  navigate(`?todo_id=${todo_id}&document_name=${document_name}`);
}, [navigate]);


useEffect(() => {
  const todo_id = searchParams.get("todo_id");
  const document_name = searchParams.get("document_name");

  if (!todo_id && !document_name) return;

  setSelectedItem({
    todo_id,
    document_name,
  });
}, [searchParams]);



const handleClose = () => {
  setSelectedItem(null);
  navigate("");
};

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
                  { label: "Pending", value: "Open" },
                  { label: "Approved", value: "Approved" },
                  { label: "Rejected", value: "Rejected" },
                ],
              },
            ]}
            defaultFilters={{ status: "Open" }}
            SkeletonComponent={CardSkeleton}
            renderCardContent={(item: any) => (
              <ApprovalRejectionLoanList
                data={item.data}
                isSelected={item.isSelected}
                onToggleSelect={item.onToggleSelect}
                onAction={item.onAction}
                loadingAction={item.loadingAction}
                onClick={() => handleRequestClick(item)}
                isBulkSelectEnabled={isBulkSelectEnabled}
              />
            )}
          />
        </CardTable>
      </div>

      {/* MODAL */}
      <LoanDetailsModal
        open={!!selectedItem}
        item={selectedItem}
        onClose={handleClose}
      />
    </div>
  );
};

export default TeamLoanRequest;
