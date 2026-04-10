"use client";
import { useState } from "react";

import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { formatCurrency } from "../../../../utils/currency";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import AllocatedToTooltip from "../../../shared/AllocatedToTooltip";
import MyApprovalActionPill from "../../../shared/atoms/MyApprovalActionPill";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";
import CardTable from "../../../shared/CardTable";
import { Loan } from "../Type/loan";
import LoanDetails from "./LoanDetails";
import LoanInstallments from "./LoanInstallment";
import SearchInputWrapper from "../../../shared/SearchBar";
import { NoDataFound } from "../../../shared/atoms/NoDataFound";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useRevokeEvent } from "../../../../hooks/userApprovalList";
import { useLoadingOverlay } from "../../../../context/OverlayContext";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import toast from "react-hot-toast";
import { queryClient } from "../../../../providers/QueryProvider";


interface LoanListProps {
  loans: Loan[];
  handleEdit: (docname: string) => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}
function calculateEndMonth(startDate: string, tenure: number) {
  if (!startDate || !tenure) return "-";

  const date = new Date(startDate);
  date.setMonth(date.getMonth() + tenure);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${year}`;
}

export default function LoanList({
  handleEdit,
  loans,
  searchTerm,
  onSearchChange,
}: LoanListProps) {



  const titles = [
    "",
    "Loan Name",
    "Loan Type",
    "Loan Amount",
    "Rate of Interest",
    "Standard Interest",
    "EMI Type",
    "Tenure",
    "Start Date",
    "End Month",
    "Status",
    "Actions",
  ];

  const columnWidths = [
    "0.1rem",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
  ];

  return (
    <CardTable titles={titles} columnWidths={columnWidths}>
      {onSearchChange && (
        <div className="">
          <div className="flex items-center w-full border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
            <SearchInputWrapper
              searchTerm={searchTerm || ""}
              handleSearch={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="border bg-app divide-y">
        {loans.map((loan) => (
          <LoanRow
            key={loan.loan_name}
            loan={loan}
            handleEdit={handleEdit}
            columnWidths={columnWidths}
          />
        ))}
        {loans.length === 0 && (
          <NoDataFound
            title="No Loan Requests"
            subtitle={searchTerm
              ? "No loans found matching your search criteria."
              : "No loans available."}
          />
        )}
      </div>
    </CardTable>
  );
}

// ─── Per-row sub-component ────────────────────────────────────────────────────

type LoanRowProps = {
  loan: Loan;
  handleEdit: (docname: string) => void;
  employeeId?: string;
  columnWidths: string[];
};

export const LoanRow = ({
  loan,
  handleEdit,
  employeeId,
  columnWidths,
}: LoanRowProps) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [isActed, setIsActed] = useState(false);
  const onToggle = () => {
    setExpanded(prev => !prev);
  }
  const { data: currentUser } = useCurrentUser();
  const todo = Array.isArray(loan.todo_list) && loan.todo_list.length > 0
    ? loan.todo_list[0]
    : null;

  const canRevoke =
    loan.status === "Open" && todo?.custom_allow_revoke === 1 && !isActed;
  const canEdit = todo?.can_edit === true &&
    currentUser?.name?.toLowerCase() === todo?.send_back_user?.toLowerCase() &&
    !isActed;

  const loading = useLoadingOverlay();
  const revokeEventMutation = useRevokeEvent();

  const handleRevokeClick = () => {
    if (!todo?.todo_id) return;
    loading?.show("Revoking Request...");
    revokeEventMutation.mutate(
      { docname: todo.reference_name, doctype: todo.reference_type, todo: todo.todo_id },
      {
        onSuccess: () => {
          setIsActed(true);
          queryClient.invalidateQueries({ queryKey: ["loan"] });
          queryClient.invalidateQueries({ queryKey: ["loan-requests", employeeId] });
          toast.success("Loan Request Revoked Successfully!");
        },
        onError: (error) => {
          toast.error(errorResponseFormater(error));
        },
        onSettled: () => loading?.hide(),
      },
    );
  };

  return (
    <div
      onClick={onToggle}
      className="hover:bg-primary/10 cursor-pointer"
    >
      {/* Row */}
      <div
        className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
        style={{
          gridTemplateColumns: columnWidths.join(" "),
          alignItems: "center",
        }}
      >
        {/* Expand Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 rounded transition-colors text-gray-600"
          >
            {expanded ? <IoIosArrowUp /> : <IoIosArrowDown />}
          </button>
        </div>

        {/* Loan Name */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {loan.loan_name}
        </Typography>

        {/* Loan Type */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {loan.loan_type}
        </Typography>

        {/* Loan Amount */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {loan.status === "Open"
            ? loan.loan_requested_amount
            : formatCurrency(loan.loan_approved_amount)}
        </Typography>

        {/* Rate of Interest */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {loan.rate_of_interest || "0"}%
        </Typography>

        {/* Standard Interest */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {loan.standard_interest || "0"}%
        </Typography>

        {/* EMI Type */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {loan.emi_type}{" "}
        </Typography>

        {/* Installments */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {loan.loan_tenure || "0"}
        </Typography>

        {/* Start Date */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(loan.loan_start_date)}
        </Typography>

        {/* End Month */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {loan.loan_start_date && loan.loan_tenure
            ? calculateEndMonth(loan.loan_start_date, loan.loan_tenure)
            : "-"}
        </Typography>

        {/* Status + Tooltip */}
        <div className="flex items-center justify-center">
          <AllocatedToTooltip
            users={todo?.allocated_to}
            roles={todo?.allocated_roles}
            role={todo?.role ?? ""}
            position="left"
          >
            <StatusBadge status={loan.status} />
          </AllocatedToTooltip>
        </div>

        {/* Actions */}
        <div className={`flex items-center justify-center ${isActed ? "pointer-events-none opacity-50" : ""}`}>
          <MyApprovalActionPill
            isPending={loan.status === "Open"}
            canRevoke={canRevoke}
            canEdit={canEdit}
            onRevoke={handleRevokeClick}
            onEdit={() => handleEdit(loan.name)}
            isResubmit={canEdit}
          />
        </div>
      </div>

      {expanded && (
        <div className="bg-app px-6 py-4 border-t border-gray-200">
          <div className="space-y-4">
            <LoanDetails loan={loan} />
            <LoanInstallments installments={loan.repayment_schedule} />
          </div>
        </div>
      )}
    </div>
  );
};
