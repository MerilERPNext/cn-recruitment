/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import ApprovalList from "../../../shared/ApprovalList";
import CardTable from "../../../shared/CardTable";
import ApprovalRejectionLoanList from "../component/TeamApprovallist";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import LoanDetailsModal from "./LoanDetailsView";
import { Typography } from "../../../shared/atoms/Typography";

const TeamLoanRequest = () => {
  const { isMobile } = useScreenSize();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  // 👉 FULL ITEM store karo (data + onAction + loadingAction)
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  // 👉 list row click
  const handleRequestClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

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
    <div className="max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="border-gray-100">
          <div className="px-6 py-4">
            <Typography variant="h4">Team Loan Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team loan requests
            </Typography>
          </div>
        </div>

        <div className="px-4">
          {!isMobile && (
            <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
              <ApprovalList
                doctype="Loan Application"
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                showPagination={true}
                infiniteScroll={true}
                loadMorePagination={false}
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
          )}

          {isMobile && (
            <ApprovalList
              status="Open"
              doctype="Loan Application"
              pageSize={4}
              showPagination={false}
              refetch={refetchApprovalList}
              setRefetch={setRefetchApprovalList}
              onApprovalRefetchComplete={handleApprovalRefetchComplete}
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
          )}
        </div>
      </div>

      {/* MODAL */}
      <LoanDetailsModal
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default TeamLoanRequest;
