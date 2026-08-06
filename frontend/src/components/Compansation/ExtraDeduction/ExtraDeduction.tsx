/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useTargetEmployeeCompany } from "../../../hooks/useTargetEmployeeCompany";
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import CardTable from "../../shared/CardTable";
import CustomDropdown from "../../shared/CustomDropdown";
import StatusBadge from "../../shared/atoms/statusBadge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatCurrency } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { useExtraDeductions } from "../../../hooks/useExtraDeduction";
import { ExtraDeductionData } from "../../../types/extraDeduction";

const titles = [
  "Recipient",
  "Document ID",
  "Salary Component",
  "Date",
  "Amount",
  "Status",
];

const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

export default function ExtraDeduction() {
  const { isDesktop } = useScreenSize();
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployee = targetEmployeeId || user?.employee;

  // Use the viewed employee's company (target-user support), not the logged-in
  // user's, so payroll periods and the list query match the employee on screen.
  const { targetCompany } = useTargetEmployeeCompany();
  const effectiveCompany = (targetEmployeeId ? targetCompany : user?.company) ?? "";

  // ── Payroll period filter ────────────────────────────────────────────────────
  // Periods for the employee's company; default to the one covering today (else
  // the most recent), exactly like SalarySlipList.
  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    effectiveCompany || null,
  ) as { data: { name: string; start_date: string; end_date: string }[] | undefined };
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  
  useEffect(() => {
    if (!payrollPeriods?.length || selectedPeriod) return;
    const today = new Date();
    const matched = payrollPeriods.find((p) => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      return today >= start && today <= end;
    });
    setSelectedPeriod(matched?.name || payrollPeriods[0].name);
  }, [payrollPeriods, selectedPeriod]);

  // Hook for Extra Deductions
  const { data, isLoading, isError } = useExtraDeductions(
    effectiveCompany,
    effectiveEmployee,
    selectedPeriod
  );

  // Don't render until we have employee + company info
  if (!effectiveEmployee || !effectiveCompany) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0">
          <div className="px-1 md:px-6 py-1 md:py-4">
            <Typography variant="h4">Extra Deduction History</Typography>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto md:px-4 pt-3 md:pt-4 pb-5 md:pb-20">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // Map raw API item to display shape
  const mapItem = (item: ExtraDeductionData) => ({
    id: item.name,
    salary_component: item.salary_component,
    recipient: item.employee_name || item.employee,
    invoiceId: item.name,
    date: formatToIndianDate(item.payment_date),
    amount: item.amount,
    status: item.status || (item.is_tax_applicable ? "Paid" : "Pending"),
  });

  const renderDesktopRow = (raw: ExtraDeductionData) => {
    const payment = mapItem(raw);
    return (
      <div
        key={payment.id}
        className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
        style={{ gridTemplateColumns: columnWidths.join(" "), alignItems: "center" }}
      >
        <Typography variant="bodySmall" className="font-medium text-center">
          {payment.recipient}
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {payment.invoiceId}
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {payment.salary_component}
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {payment.date}
        </Typography>

        <Typography variant="bodySmall" className="font-medium text-center">
          {formatCurrency(payment.amount)}
        </Typography>

        <div className="flex items-center justify-center">
          <StatusBadge status={payment.status} />
        </div>
      </div>
    );
  };

  const renderMobileCard = (raw: ExtraDeductionData) => {
    const payment = mapItem(raw);

    return (
      <div
        key={payment.id}
        className="cursor-pointer border-t-4 border-x border-b 
        border-x-primary/20 border-b-primary/20 
        shadow-sm border-primary bg-white rounded-xl"
      >
        <div className="p-4 flex flex-col gap-3 w-full">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Recipient</Typography>
              <Typography variant="mobileCardValue">
                {payment.recipient}
              </Typography>
            </div>
            <StatusBadge status={payment.status} />
          </div>

          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Salary Component</Typography>
              <Typography variant="mobileCardValue">
                {payment.salary_component}
              </Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel">Document ID</Typography>
              <Typography variant="mobileCardValue">
                {payment.invoiceId}
              </Typography>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Date</Typography>
              <Typography variant="mobileCardValue">{payment.date}</Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel">Amount</Typography>
              <Typography variant="mobileCardValue">
                {formatCurrency(payment.amount)}
              </Typography>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const noRecords = (
    <NoDataFound
      title="No Extra Deductions Found"
      subtitle="No extra deduction records available."
    />
  );

  return (
    <div className="flex flex-col h-full bg-app font-brand">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 mb-6 sticky top-0 z-10 w-full">
        {/* Desktop top bar (hidden on mobile) */}
        {isDesktop && (
          <div className="sm:flex items-center justify-between h-[52px] px-7 ">
            <span className="font-bold text-[17px] text-text-title tracking-tight">Extra Deduction History</span>
            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-text-body2">Payroll Period</span>
                <CustomDropdown
                  value={selectedPeriod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSelectedPeriod(e.target.value)
                  }
                  options={
                    payrollPeriods?.map((p) => ({ value: p.name, label: p.name })) || []
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile top bar (hidden on sm+) */}
        {!isDesktop && (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[16px] text-text-title tracking-tight">Extra Deduction History</span>
              <CustomDropdown
                value={selectedPeriod}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedPeriod(e.target.value)
                }
                options={
                  payrollPeriods?.map((p) => ({ value: p.name, label: p.name })) || []
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* ---------------------- DESKTOP ---------------------- */}
      {isDesktop && (
        <div className="flex-1 overflow-y-auto md:px-4 pt-3 md:pt-4 pb-5 md:pb-20">
          <CardTable titles={titles} columnWidths={columnWidths}>
            {isLoading ? (
              <CardSkeleton />
            ) : isError || !data?.data?.length ? (
              noRecords
            ) : (
              data.data.map((item) => renderDesktopRow(item))
            )}
          </CardTable>
        </div>
      )}

      {/* ---------------------- MOBILE ---------------------- */}
      {!isDesktop && (
        <div className="space-y-4 px-1">
          {isLoading ? (
            <CardSkeleton />
          ) : isError || !data?.data?.length ? (
            noRecords
          ) : (
            data.data.map((item) => renderMobileCard(item))
          )}
        </div>
      )}
    </div>
  );
}
