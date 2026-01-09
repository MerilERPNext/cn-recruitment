/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalRejectionAdvanceList from "./Component/ApprovalAdvanceList";
import AdvanceDetailsModal from "./Component/AdvanceViewDetailsModel";

const TeamAdvanceRequest = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  const Card = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={`my-dashboard-card ${className}`}>{children}</div>;
  const CardHeader = ({ title }: { title: string; onSeeAll: () => void }) => (
    <div className="flex justify-between items-center mb-4">
      <h2 className="section-title">{title}</h2>
    </div>
  );
  return (
    <div>
      <Card>
        <CardHeader
          title="Employee Advance Requests"
          onSeeAll={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
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
              "5%",
              "15%",
              "15%",
              "10%",
              "12%",
              "12%",
              "10%",
              "13%",
            ]}
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
      </Card>
      <AdvanceDetailsModal
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default TeamAdvanceRequest;
