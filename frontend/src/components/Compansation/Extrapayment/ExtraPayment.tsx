/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useExtraPayment } from "../../../hooks/useExtraPAyments";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { formatCurrency } from "../../../utils/currency";
import CardTable from "../../shared/CardTable";
import StatusBadge from "../../shared/atoms/statusBadge";
import { useScreenSize } from "../../../hooks/useScreenSize";



interface Payment {
  salary_component: string;
  id: string;
  recipient: string;
  invoiceId: string;
  date: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
}




export default function ExtraPayment() {
  const [searchTerm, setSearchTerm] = useState("");
  const { isDesktop } = useScreenSize();

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: extraPayment } = useExtraPayment(
    user?.company || null,
    user?.employee || null,
  );



  // -------- MAP API DATA ----------
  const apiPayments: Payment[] =
    (extraPayment as any)?.extra_payments?.map((item: any) => ({
      id: item.name,
      salary_component: item.salary_component,
      recipient: (extraPayment as any)?.employee,
      invoiceId: item.name,
      date: formatToIndianDate(item.payment_date),
      amount: item.amount,
      status: item.is_tax_applicable ? "Paid" : "Pending",
    })) ?? [];

  // -------- FILTER ----------

  const filteredPayments = apiPayments.filter((payment) =>
    payment.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoiceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.salary_component?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const titles = [
    "Recipient",
    "Document ID",
    "Salary Component",
    "Date",
    "Amount",
    "Status",
  ];

  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="flex flex-col h-full">
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
                <Typography variant="h4" className="mb-2">Extra Payment History</Typography>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* ---------------------- WEB ---------------------- */}
      {isDesktop && (
        <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">

          <CardTable titles={titles} columnWidths={columnWidths} >
            <div className="flex items-center justify-between">
              <div className="relative w-full ">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-100  w-full "
                />
              </div>
            </div>
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="grid items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
                style={{
                  gridTemplateColumns: columnWidths.join(" "),
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {payment.recipient}
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {payment.invoiceId}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {payment.salary_component}
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {payment.date}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {payment.amount}
                </Typography>
                <div className="flex items-center justify-center">
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))}
          </CardTable>
        </div>
      )}

      {/* ---------------------- MOBILE ---------------------- */}
      {!isDesktop && (
        <div className="space-y-4 px-1">
          {filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="cursor-pointer border-t-4 border-x border-b 
                border-x-primary/20 border-b-primary/20 
                shadow-sm border-primary bg-white rounded-xl"
            >
              <div className="p-4 flex flex-col gap-3 w-full">
                {/* Header: Recipient + Status */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">Recipient</Typography>
                    <Typography variant="mobileCardValue">
                      {payment.recipient}
                    </Typography>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>

                {/* Salary Component + Document ID */}
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

                {/* Date + Amount */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">Date</Typography>
                    <Typography variant="mobileCardValue">
                      {payment.date}
                    </Typography>
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
          ))}
        </div>
      )}

      {filteredPayments.length === 0 && (
        <p className="text-center text-gray-500 mt-10">No payments found.</p>
      )}
    </div>
  );
}
