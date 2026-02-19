/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import AdvanceDetailsModal from "./Component/AdvanceViewDetailsModel";
import ApprovalRejectionAdvanceList from "./Component/ApprovalAdvanceList";

const TeamAdvanceRequest = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const { isDesktop } = useScreenSize();

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
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-2 py-1 md:py-4">
            <Typography variant="h4">Team Advance Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team advance requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-2 pb-5 md:pb-20">
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
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
                  { label: "Pending", value: "Pending" },
                  { label: "Approved", value: "Approved" },
                  { label: "Rejected", value: "Rejected" },
                ],
              },
            ]}
            defaultFilters={{ status: "Pending" }}
            SkeletonComponent={CardSkeleton}
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

      <AdvanceDetailsModal
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default TeamAdvanceRequest;
