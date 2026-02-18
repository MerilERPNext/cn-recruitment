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

const formatINR = (num: number) =>
  `${formatCurrency(num.toLocaleString("en-IN"))}`;

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

      {/* Table */}
      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={titles} columnWidths={columnWidths}>
          {isLoading ? (
            <CardSkeleton />
          ) : invoices.length > 0 ? (
            invoices.map((inv: any, idx: number) => {
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

                  <Typography variant="bodySmall" className="text-center">
                    {inv.start_date}
                  </Typography>

                  <Typography variant="bodySmall" className="text-center">
                    {inv.end_date}
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

                  {/* ✅ Upload */}
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
            })
          ) : (
            <div className="py-10 text-center text-gray-500">
              No invoices found
            </div>
          )}
        </CardTable>
      </div>
    </div>
  );
}
