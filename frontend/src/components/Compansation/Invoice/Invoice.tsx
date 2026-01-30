/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useInvoiceSalarySlip } from "../../../hooks/payroll/usePerquisite";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import InvoicePDFview from "./Component/InvoicePDFview";
import CardTable from "../../shared/CardTable";

const formatINR = (num: number) => `₹ ${num.toLocaleString("en-IN")}`;

export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(true);

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { data: invoiceData } = useInvoiceSalarySlip(
    user?.employee || "",
    user?.company || ""
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

  const columnWidths = [
    "1.2fr",
    "1fr",
    "1fr",
    "1.5fr",
    "1fr",
    "1fr",
    "1fr",
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Invoices</h2>
          <p className="text-sm text-gray-500">
            Track and manage your invoices
          </p>
        </div>

        {/* Hide Amount Toggle */}
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

      {/* ✅ CardTable Wrapper */}
      <CardTable titles={titles} columnWidths={columnWidths}>
        <div className="border bg-white divide-y">
          {invoices.map((inv: any, idx: number) => {
            const invoiceNo = inv.name;

            return (
              <div
                key={invoiceNo || idx}
                className="hover:bg-primary/10"
              >
                <div
                  className="grid gap-4 px-6 py-4 text-sm"
                  style={{
                    gridTemplateColumns: columnWidths.join(" "),
                    alignItems: "center",
                  }}
                >
                  <div className="font-medium">{invoiceNo}</div>
                  <div>{inv.start_date}</div>
                  <div>{inv.end_date}</div>
                  <div>{inv.employee_name}</div>

                  <div className={`font-medium ${amountClass}`}>
                    {formatINR(inv.gross_pay || 0)}
                  </div>

                  <div className={`font-medium ${amountClass}`}>
                    {formatINR(inv.net_pay || 0)}
                  </div>

                  <div>
                    <InvoicePDFview
                      invoiceID={invoiceNo}
                      disabled={false}
                      onClick={handleInvoiceClick}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {invoices.length === 0 && (
            <div className="py-10 text-center text-gray-500">
              No invoices found
            </div>
          )}
        </div>
      </CardTable>
    </div>
  );
}
