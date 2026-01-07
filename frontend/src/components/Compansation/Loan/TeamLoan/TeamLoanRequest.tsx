/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import ApprovalList from "../../../shared/ApprovalList";
import CardTable from "../../../shared/CardTable";
import ApprovalRejectionLoanList from "../component/TeamApprovallist";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import LoanDetailsModal from "./LoanDetailsView";

const TeamLoanRequest = () => {
  const { isMobile } = useScreenSize();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);

  // 👉 FULL ITEM store karo (data + onAction + loadingAction)
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  // 👉 list row click
  const handleRequestClick = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  return (
    <div>
      {!isMobile && (
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
            pageSize={1000000}
            showPagination={false}
            refetch={refetchApprovalList}
            setRefetch={setRefetchApprovalList}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            renderCardContent={(item: any) => (
              <ApprovalRejectionLoanList
                data={item.data}
                isSelected={item.isSelected}
                onToggleSelect={item.onToggleSelect}
                onAction={item.onAction}
                loadingAction={item.loadingAction}
                onClick={() => handleRequestClick(item)} // ✅ full item
              />
            )}
          />
        </CardTable>
      )}

      {isMobile && (
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
              data={item.data}
              isSelected={item.isSelected}
              onToggleSelect={item.onToggleSelect}
              onAction={item.onAction}
              loadingAction={item.loadingAction}
              onClick={() => handleRequestClick(item)} // ✅
            />
          )}
        />
      )}

      {/* MODAL */}
      <LoanDetailsModal
        open={!!selectedItem}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};

export default TeamLoanRequest;
