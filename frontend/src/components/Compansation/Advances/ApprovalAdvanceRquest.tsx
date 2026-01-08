/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalRejectionAdvanceList from "./Component/ApprovalAdvanceList";
import { Typography } from "../../shared/atoms/Typography";


const TeamAdvanceRequest = () => {

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback((data: any) => {
    console.log("Loan click", data);
  }, []);

  const Card = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={` ${className}`}>{children}</div>;
const CardHeader = ({
  title,
}: {
  title: string;
  onSeeAll: () => void;
}) => (
  <div className="flex flex-col w-full items-start mb-4">
    <Typography variant="subheading" color="body1">{title}</Typography>
    <Typography variant="bodySmall" color="body2">Track {title}</Typography>
  </div>
);
  return (
    <div>
      <Card>
      <CardHeader
                  title="Employee Advance Requests" onSeeAll={function (): void {
                      throw new Error("Function not implemented.");
                  } }                                />
        <div className=" rounded-lg overflow-x-auto">
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
  columnWidths={[
    "5%",   // Select (checkbox)
    "15%",  // Employee Name
    "15%",  // Advance Type
    "10%",  // Amount
    "12%",  // Start Date
    "12%",  // End Date
    "10%",  // Status
    "13%",  // Actions
  ]}
>
          
            <ApprovalList
              status="Pending"
              doctype={"Employee Advance"}
              pageSize={4}
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
                  onClick={handleRequestClick}
                  loadingAction={item?.loadingAction}
                />
              )}
            />
          </CardTable>
        </div>
      </Card>
    </div>
  );
};

export default TeamAdvanceRequest;
