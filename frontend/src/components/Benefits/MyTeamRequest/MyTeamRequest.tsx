"use client";

import type React from "react";
import { useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import BenefitRequestItem from "./BenefitRequestItem";

const MyTeamRequest: React.FC = () => {
  const { isDesktop } = useScreenSize();

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
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Benefit Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team benefit requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={tableTitles} columnWidths={finalColumnWidths}>
          <ApprovalList
            doctype={"Employee Benefit Claim"}
            // refetch={refetchApprovalList}
            // setRefetch={setRefetchApprovalList}
            // onApprovalRefetchComplete={handleApprovalRefetchComplete}
            pageSize={10}
            infiniteScroll={false}
            loadMorePagination={false}
            showPagination={true}
            isSearch={true}
            isFilter={true}
            columnWidths={finalColumnWidths}
            onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
            filterFields={[
              {
                fieldname: "custom_status",
                label: "Status",
                fieldtype: "Select",
                options: [
                  {
                    label: "Pending",
                    key: "Pending",
                    value: "Pending",
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
            SkeletonComponent={CardSkeleton}
            renderCardContent={(item) => {
              if (item?.data?.custom_selected_doctype_action === "Send Back") {
                return null;
              }
              return (
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
              )
            }}
          />
        </CardTable>
      </div>
    </div>
  );
};

export default MyTeamRequest;
