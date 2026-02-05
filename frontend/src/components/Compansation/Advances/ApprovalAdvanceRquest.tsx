/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalRejectionAdvanceList from "./Component/ApprovalAdvanceList";
import AdvanceDetailsModal from "./Component/AdvanceViewDetailsModel";
import { Typography } from "../../shared/atoms/Typography";

const TeamAdvanceRequest = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  const tableTitles = isBulkSelectEnabled
    ? [
        "Select",
        "Employee Name",
        "Advance Type",
        "Amount",
        "Start Date",
        "End Date",
        "Status",
        "ACTIONS",
      ]
    : [
        "Employee Name",
        "Advance Type",
        "Amount",
        "Start Date",
        "End Date",
        "Status",
        "ACTIONS",
      ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="border-gray-100">
          <div className="px-6 py-4">
            <Typography variant="h4">Team Advance Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team advance requests
            </Typography>
          </div>
        </div>
        <div className="px-4">
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            <ApprovalList
              status="Pending"
              doctype={"Employee Advance"}
              pageSize={10}
              refetch={refetchApprovalList}
              setRefetch={setRefetchApprovalList}
              onApprovalRefetchComplete={handleApprovalRefetchComplete}
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
                    { label: "Pending", value: "Pending" },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },
                  ],
                },
              ]}
              defaultFilters={{ status: "Pending" }}
              renderCardContent={(item: any) => (
                <ApprovalRejectionAdvanceList
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  onClick={() => handleRequestClick(item)}
                  loadingAction={item?.loadingAction}
                  isBulkSelectEnabled={isBulkSelectEnabled}
                />
              )}
            />
          </CardTable>
        </div>
      </div>
      <AdvanceDetailsModal
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default TeamAdvanceRequest;
