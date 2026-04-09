/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import CardTable from "../../shared/CardTable";
import StatusBadge from "../../shared/atoms/statusBadge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatCurrency } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import DataListView from "../../DataListView";

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
  const { data: user } = useCurrentEmployeeAllDetails({
    fields: ["employee", "company"]
  });
  // Don't render until we have employee + company info
  if (!user?.employee || !user?.company) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0">
          <div className="px-1 md:px-6 py-1 md:py-4">
            <Typography variant="h4">Extra Payment History</Typography>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const customAPI = {
    method: "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.extra_payment_api.get_extra_payment_list",
    params: {
      employee: user.employee,
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop ? (
              <div>
                <Typography variant="h4">Extra Payment History</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your extra payments
                </Typography>
              </div>
            ) : (
              <div>
                <Typography variant="h4" className="mb-2">
                  Extra Payment History
                </Typography>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------- DESKTOP ---------------------- */}
      {isDesktop && (
        <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
          <CardTable titles={titles} columnWidths={columnWidths}>
            <DataListView
              queryKey={["extra-payments", user.employee, user.company]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={false}
              showPagination={true}
              SkeletonComponent={CardSkeleton}
              renderItem={(raw: any) => renderDesktopRow(raw.extra_payments)}
              noRecordsScreen={noRecords}
            />
          </CardTable>
        </div>
      )}

      {/* ---------------------- MOBILE ---------------------- */}
      {!isDesktop && (
        <div className="space-y-4 px-1">
          <DataListView
            queryKey={["extra-payments", user.employee, user.company]}
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