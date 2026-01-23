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

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  return (
    <div className="px-2">
      <div className="flex justify-between items-center mb-2 border-b border-gray-200 px-2">
        <div className="flex flex-col mb-2">
          <Typography variant="h4">Team Advance Requests</Typography>
          <Typography variant="bodySmall" color="body2">
            Track and manage team advance requests
          </Typography>
        </div>
      </div>
      <div className="max-w-screen rounded-lg overflow-x-auto">
        <CardTable
          titles={[
            "Select",
            "Employee Name",
            "Advance Type",
            "Amount",
            "Start Date",
            "End Date",
            "Status",
            "Actions",
          ]}
          columnWidths={["5%", "15%", "15%", "10%", "12%", "12%", "10%", "13%"]}
        >
          <ApprovalList
            status="Pending"
            doctype={"Employee Advance"}
            pageSize={10000}
            showPagination={false}
            refetch={refetchApprovalList}
            setRefetch={setRefetchApprovalList}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            renderCardContent={(item: any) => (
              <ApprovalRejectionAdvanceList
                isSelected={item?.isSelected}
                onToggleSelect={item?.onToggleSelect}
                data={item?.data}
                onAction={item?.onAction}
                onClick={() => handleRequestClick(item)}
                loadingAction={item?.loadingAction}
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
