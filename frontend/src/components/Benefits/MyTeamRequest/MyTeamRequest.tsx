"use client";

import type React from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import BenefitRequestItem from "./BenefitRequestItem";
import { Typography } from "../../shared/atoms/Typography";
import { useState } from "react";

const MyTeamRequest: React.FC = () => {
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const tableTitles = isBulkSelectEnabled
    ? [
        "Select",
        "Employee Name",
        "Claim Benefit For",
        "Claimed Amount",
        "Max Amount Eligible",
        "Claim Date",
        "Status",
        "ACTIONS",
      ]
    : [
        "Employee Name",
        "Claim Benefit For",
        "Claimed Amount",
        "Max Amount Eligible",
        "Claim Date",
        "Status",
        "ACTIONS",
      ];

  const finalColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="border-gray-100">
          <div className="px-6 py-4">
            <Typography variant="h4">Team Benefit Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team benefit requests
            </Typography>
          </div>
        </div>
        <div className="px-4">
          <CardTable titles={tableTitles} columnWidths={finalColumnWidths}>
            <ApprovalList
              doctype={"Employee Benefit Claim"}
              // refetch={refetchApprovalList}
              // setRefetch={setRefetchApprovalList}
              // onApprovalRefetchComplete={handleApprovalRefetchComplete}
              pageSize={10}
              showPagination={true}
              infiniteScroll={true}
              loadMorePagination={false}
              isSearch={true}
              isFilter={true}
              columnWidths={finalColumnWidths}
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
              renderCardContent={(item) => (
                <BenefitRequestItem
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  // onClick={handleRequestClick}
                  loadingAction={item?.loadingAction}
                  isBulkSelectEnabled={isBulkSelectEnabled}
                />
              )}
            />
          </CardTable>
        </div>
      </div>
    </div>
  );
};

export default MyTeamRequest;
