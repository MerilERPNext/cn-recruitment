/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalRejectionAdvanceList from "./Component/ApprovalAdvanceList";


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
  }) => <div className={`my-dashboard-card ${className}`}>{children}</div>;
const CardHeader = ({
  title,
}: {
  title: string;
  onSeeAll: () => void;
}) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="section-title">{title}</h2>
  </div>
);
  return (
    <div>
      <Card>
      <CardHeader
                  title="Employee Advance Requests" onSeeAll={function (): void {
                      throw new Error("Function not implemented.");
                  } }                                />
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <CardTable
            titles={[
                "Advance Name",
                "Amount",
                "Deductions",
                "Start Date",
                "End Date",
                "Status",
                "Actions"
            ]}
            columnWidths={[
              "10%",
              "10%",
              "10%",
              "10%",
              "10%",
              "20%",
              "20%",
            ]}
          >
            <ApprovalList
              status="Open"
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
