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
import { formatCurrency } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { useFileUpload } from "../../../hooks/useEmployee";
import toast from "react-hot-toast";
import { useUpdateSalarySlip } from "../../../hooks/useSalaryDetails";
import formatToIndianDate from "../../../utils/formatToIndianDate";

const formatINR = (num: number) =>
  `${formatCurrency(num.toLocaleString("en-IN"))}`;

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Paid":
      return "bg-green-100 text-green-700";
    case "Pending":
      return "bg-yellow-100 text-yellow-700";
    case "Overdue":
      return "bg-red-100 text-red-700";
    case "Cancelled":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
};


export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(true);
  const { isDesktop } = useScreenSize();

  const uploadMutation = useFileUpload();

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { data: invoiceData, isLoading } = useInvoiceSalarySlip(
    user?.employee || "",
    user?.company || "",
  );

  const invoices = Array.isArray(invoiceData) ? invoiceData : [];
  const updateSalarySlipMutation = useUpdateSalarySlip();

  const handleInvoiceClick = (invoiceID: string) => {
    console.log("Clicked invoiceID:", invoiceID);
  };

  // 🔥 Upload → Salary Slip update
  const handleUploadAndAttach = (
    file: File | null,
    invoiceName: string
  ) => {
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess(data) {
        const fileUrl = data?.file_url;

        if (!fileUrl) {
          toast.error("File URL not found");
          return;
        }

        updateSalarySlipMutation.mutate(
          {
            salarySlipName: invoiceName,
            fileUrl,
          },
          {
            onSuccess() {
              toast.success("File uploaded & attached successfully");
            },
            onError(err) {
              console.error("Salary Slip update failed", err);
              toast.error("Upload success but attach failed");
            },
          }
        );
      },

      onError(err) {
        console.error(err);
        toast.error("File upload failed");
      },
    });
  };

  const amountClass = hideAmount
    ? "blur-sm select-none pointer-events-none"
    : "";

  const titles = [
    "Invoice No",
    "Status",
    "Invoice Date",
    "Due Date",
    "Customer",
    "Sub Total",
    "Total Amount",
    "Attach Proof",
    "Action",
  ];

  const columnWidths = [
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1fr",
    "1.2fr",
    "1fr",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
              <Typography variant="h4">My Invoices</Typography>
            )}

            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm">
              <span className="text-sm text-gray-600">
                {hideAmount ? "Show Amount" : "Hide Amount"}
              </span>
              <button
                onClick={() => setHideAmount((p) => !p)}
                className={`w-8 h-5 rounded-xl relative transition ${hideAmount ? "bg-primary-500" : "bg-gray-300"
                  }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${hideAmount ? "right-0.5" : "left-0.5"
                    }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {isLoading ? (
          <CardSkeleton />
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            No invoices found
          </div>
        ) : isDesktop ? (
          /* ================= DESKTOP TABLE ================= */
          <CardTable titles={titles} columnWidths={columnWidths}>
            {invoices.map((inv: any, idx: number) => {
              const invoiceNo = inv.name;

              return (
                <div
                  key={invoiceNo || idx}
                  className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 cursor-pointer hover:bg-primary/10"
                  style={{ gridTemplateColumns: columnWidths.join(" ") }}
                >
                  <Typography variant="bodySmall" className="text-center">
                    {invoiceNo}
                  </Typography>

                  {inv.invoice_status && (
                      <span
                        className={`flex-shrink-0 ml-2 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(inv.invoice_status)}`}
                      >
                        {inv.invoice_status}
                      </span>
                    )}

                  <Typography variant="bodySmall" className="text-center">
                    {formatToIndianDate(inv.start_date)}
                  </Typography>

                  <Typography variant="bodySmall" className="text-center">
                    {formatToIndianDate(inv.end_date)}
                  </Typography>

                  <Typography variant="bodySmall" className="text-center">
                    {inv.employee_name}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className={`text-center ${amountClass}`}
                  >
                    {formatINR(inv.gross_pay || 0)}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className={`text-center ${amountClass}`}
                  >
                    {formatINR(inv.net_pay || 0)}
                  </Typography>

                  {/* Upload */}
                  <div className="flex justify-center">
                    <input
                      type="file"
                      onChange={(e) =>
                        handleUploadAndAttach(
                          e.target.files?.[0] || null,
                          invoiceNo,
                        )
                      }
                      className="text-xs border rounded
                      file:border-0 file:bg-primary
                      file:text-white file:px-2 file:py-1"
                    />
                  </div>

                  {/* View */}
                  <div className="flex justify-center">
                    <InvoicePDFview
                      invoiceID={invoiceNo}
                      disabled={false}
                      onClick={handleInvoiceClick}
                    />
                  </div>
                </div>
              );
            })}
          </CardTable>
        ) : (
          /* ================= MOBILE CARDS ================= */
          <div className="space-y-3 px-1">
            {invoices.map((inv: any, idx: number) => {
              const invoiceNo = inv.name;

              return (
                <div
                  key={invoiceNo || idx}
                  className="border rounded-lg bg-white shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex flex-col min-w-0">
                      <Typography variant="bodySmall" className="font-semibold text-gray-800 truncate">
                        {invoiceNo}
                      </Typography>
                      <span className="text-xs text-gray-500">
                        {inv.employee_name}
                      </span>
                    </div>
                    {inv.invoice_status && (
                      <span
                        className={`flex-shrink-0 ml-2 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(inv.invoice_status)}`}
                      >
                        {inv.invoice_status}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Invoice Date</span>
                      <span className="font-medium text-gray-800">{formatToIndianDate(inv.start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Due Date</span>
                      <span className="font-medium text-gray-800">{formatToIndianDate(inv.end_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sub Total</span>
                      <span className={`font-medium ${amountClass}`}>
                        {formatINR(inv.gross_pay || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Amount</span>
                      <span className={`font-semibold text-blue-600 ${amountClass}`}>
                        {formatINR(inv.net_pay || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center gap-3 px-4 py-3 border-t bg-gray-50 rounded-b-lg">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        onChange={(e) =>
                          handleUploadAndAttach(
                            e.target.files?.[0] || null,
                            invoiceNo,
                          )
                        }
                        className="text-xs w-full border rounded
                        file:border-0 file:bg-primary
                        file:text-white file:px-2 file:py-1"
                      />
                    </label>
                    <InvoicePDFview
                      invoiceID={invoiceNo}
                      disabled={false}
                      onClick={handleInvoiceClick}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
