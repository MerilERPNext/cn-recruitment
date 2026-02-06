/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useInvoiceSalarySlip } from "../../../hooks/payroll/usePerquisite";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import InvoicePDFview from "./Component/InvoicePDFview";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";

const formatINR = (num: number) => `₹ ${num.toLocaleString("en-IN")}`;

export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(true);
  const { isDesktop } = useScreenSize();

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { data: invoiceData } = useInvoiceSalarySlip(
    user?.employee || "",
    user?.company || "",
  );

  const invoices = Array.isArray(invoiceData) ? invoiceData : [];

  const handleInvoiceClick = (invoiceID: string) => {
    console.log("Clicked invoiceID:", invoiceID);
  };

  const amountClass = hideAmount
    ? "blur-sm select-none pointer-events-none"
    : "";

  const titles = [
    "Invoice No",
    "Invoice Date",
    "Due Date",
    "Customer",
    "Sub Total",
    "Total Amount",
    "Action",
  ];

  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop ? (
              <div>
                <Typography variant="h4">Invoices</Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your invoices
                </Typography>
              </div>
            ) : (
              <div>
                <Typography variant="h4">My Invoices</Typography>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
              <span className="text-sm text-gray-600">
                {hideAmount ? "Show Amount" : "Hide Amount"}
              </span>
              <button
                onClick={() => setHideAmount((prev) => !prev)}
                className={`w-8 h-5 rounded-xl relative transition ${
                  hideAmount ? "bg-primary-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${
                    hideAmount ? "right-0.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={titles} columnWidths={columnWidths}>
          {invoices.map((inv: any, idx: number) => {
            const invoiceNo = inv.name;

            return (
              <div
                key={invoiceNo || idx}
                className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
                style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
              >
                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {invoiceNo}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {inv.start_date}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {inv.end_date}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className="font-medium text-center"
                >
                  {inv.employee_name}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className={`font-medium text-center ${amountClass}`}
                >
                  {formatINR(inv.gross_pay || 0)}
                </Typography>

                <Typography
                  variant="bodySmall"
                  className={`font-medium text-center ${amountClass}`}
                >
                  {formatINR(inv.net_pay || 0)}
                </Typography>

                <div className="flex items-center justify-center">
                  <InvoicePDFview
                    invoiceID={invoiceNo}
                    disabled={false}
                    onClick={handleInvoiceClick}
                  />
                </div>
              </div>
            );
          })}

          {invoices.length === 0 && (
            <div className="py-10 text-center text-gray-500">
              No invoices found
            </div>
          )}
        </CardTable>
      </div>
    </div>
  );
}
