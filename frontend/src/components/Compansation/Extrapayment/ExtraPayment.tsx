/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import StatusBadge from "../../shared/atoms/statusBadge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatCurrency } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import DataListView from "../../DataListView";

const PERQUISITE_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: false, // Actions
  },
  {
    sortable: true,
    type: "string",
    field: "name",
    getValue: (payment: any) =>
      payment.invoiceId ?? "",
  },

  {
    sortable: true,
    type: "string",
    field: "salary_component",
    getValue: (payment: any) =>
      payment.salary_component ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "payroll_date",
    getValue: (payment: any) =>
      payment.date ?? "",
  },
  {
    sortable: true,
    type: "number",
    field: "amount",
    getValue: (payment: any) =>
      payment.amount ?? "",
  },

  {
    sortable: false, // Actions
  },
];

const titles = [
  "Recipient",
  "Document ID",
  "Salary Component",
  "Date",
  "Amount",
  "Status",
];

const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

export default function ExtraPayment() {
  const { isDesktop } = useScreenSize();
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployee = targetEmployeeId || user?.employee;
  // Don't render until we have employee + company info
  if (!effectiveEmployee || !user?.company) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0">
          <div className="px-1 md:px-6 py-1 md:py-4">
            <Typography variant="h4">Extra Payment History</Typography>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto md:px-4 pt-3 md:pt-4 pb-5 md:pb-20">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const customAPI = {
    method: "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.extra_payment_api.get_extra_payment_list",
    params: {
      employee: effectiveEmployee,
      company: user.company,
    },
    transformResponse: (res: any) => {
      return res.extra_payments || [];
    },
  };

  // Map raw API item to display shape
  const mapItem = (item: any, employeeName: string) => ({
    id: item.name,
    salary_component: item.salary_component,
    recipient: employeeName || item.employee,
    invoiceId: item.name,
    date: formatToIndianDate(item.payment_date),
    amount: item.amount,
    status: item.is_tax_applicable ? "Paid" : "Pending",
  });

  const renderDesktopRow = (raw: any) => {
    const payment = mapItem(raw, raw.employee_name || raw.employee);
    return (
      <div
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

  const renderMobileCard = (raw: any) => {
    const payment = mapItem(raw, raw.employee_name || raw.employee);

    return (
      <div
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
      title="No Extra Payments Found"
      subtitle="No extra payment records available."
    />
  );

  return (
    <div className="flex flex-col h-full bg-app font-brand">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 mb-6 sticky top-0 z-10 w-full">
        {/* Desktop top bar (hidden on mobile) */}
        {isDesktop && (
          <div className="sm:flex items-center justify-between h-[52px] px-7 ">
            <span className="font-bold text-[17px] text-text-title tracking-tight">Extra Payment History</span>
            <div className="flex items-center gap-3.5">
              {/* No other buttons inside header */}
            </div>
          </div>
        )}

        {/* Mobile top bar (hidden on sm+) */}
        {!isDesktop && (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[16px] text-text-title tracking-tight">Extra Payment History</span>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------- DESKTOP ---------------------- */}
      {isDesktop && (
        <div className="flex-1 overflow-y-auto md:px-4 pt-3 md:pt-4 pb-5 md:pb-20">
          <CardTable titles={titles} columnWidths={columnWidths} columnSortConfig={PERQUISITE_SORT_CONFIG}>
            <DataListView
              queryKey={["extra-payments", effectiveEmployee, user.company]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={false}
              showPagination={true}
              SkeletonComponent={CardSkeleton}
              renderItem={(raw: any) => renderDesktopRow(raw)}

              noRecordsScreen={noRecords}
            />
          </CardTable>
        </div>
      )}

      {/* ---------------------- MOBILE ---------------------- */}
      {!isDesktop && (
        <div className="space-y-4 px-1">
          <DataListView
            queryKey={["extra-payments", effectiveEmployee, user.company]}
            customAPI={customAPI}
            isSearch={true}
            isFilter={false}
            showPagination={true}
            SkeletonComponent={CardSkeleton}
            renderItem={(raw: any) => renderMobileCard(raw)}
            noRecordsScreen={noRecords}
          />
        </div>
      )}
    </div>
  );
}