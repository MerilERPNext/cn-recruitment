"use client";

import type React from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import BenefitRequestItem from "./BenefitRequestItem";
import { Typography } from "../../shared/atoms/Typography";

const MyTeamRequest: React.FC = () => {
  return (
    <div className="min-h-screen">
      <div className="">
        <div className="flex justify-between items-center mb-2 border-b border-gray-200 px-2">
          <div className="flex flex-col mb-2">
            <Typography variant="h4">Team Benefit Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team benefit requests
            </Typography>
          </div>
        </div>
        <CardTable
          titles={[
            "",
            "Employee Name",
            "Claim Benefit For",
            "Claimed Amount",
            "Max Amount Eligible",
            "Claim Date",
            "Status",
            "Actions",
          ]}
          columnWidths={["2%", "10%", "18%", "10%", "10%", "10%", "10%", "20%"]}
        >
          <ApprovalList
            status="Pending"
            doctype={"Employee Benefit Claim"}
            pageSize={4}
            showPagination={false}
            // refetch={refetchApprovalList}
            // setRefetch={setRefetchApprovalList}
            // onApprovalRefetchComplete={handleApprovalRefetchComplete}
            renderCardContent={(item) => (
              <BenefitRequestItem
                isSelected={item?.isSelected}
                onToggleSelect={item?.onToggleSelect}
                data={item?.data}
                onAction={item?.onAction}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                // onClick={handleRequestClick}
                loadingAction={item?.loadingAction}
              />
            )}
          />
        </CardTable>
      </div>
    </div>
  );
};

export default MyTeamRequest;
