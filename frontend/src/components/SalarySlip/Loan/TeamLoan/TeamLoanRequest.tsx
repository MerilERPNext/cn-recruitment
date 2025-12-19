/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useCallback } from "react";
import ApprovalList from "../../../shared/ApprovalList";
import CardTable from "../../../shared/CardTable";
import ApprovalRejectionLoanList from "../component/TeamApprovallist";
import { useScreenSize } from "../../../../hooks/useScreenSize";

const TeamLoanRequest = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const { isMobile } = useScreenSize();

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
  }) => (
    <div className={`my-dashboard-card ${className ?? ""}`}>{children}</div>
  );

  const CardHeader = ({ title }: { title: string }) => (
    <div className="flex justify-between items-center mb-4">
      <h2 className="section-title">{title}</h2>
    </div>
  );

  return (
    <div>
      <Card>
        <CardHeader title="Employee Loan Requests" />

        {!isMobile && (
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <CardTable
              titles={[
                "Select",
                "Employee",
                "Loan Type",
                "Loan Amount",
                "Rate of Interest",
                "Standard Interest",
                "Start Date",
                "End Date",
                "Status",
                "Actions",
              ]}
              columnWidths={[
                "5%",
                "8%",
                "8%",
                "8%",
                "8%",
                "10%",
                "8%",
                "8%",
                "8%",
                "20%",
              ]}
            >
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
        )}

        {isMobile && (
          <div className="space-y-3">
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
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  onClick={handleRequestClick}
                  loadingAction={item?.loadingAction}
                />
              )}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeamLoanRequest;
