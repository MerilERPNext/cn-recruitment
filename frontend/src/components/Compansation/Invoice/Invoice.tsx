/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useInvoiceSalarySlip } from "../../../hooks/payroll/usePerquisite";
import {
  useCurrentEmployeeAllDetails,
  useFileUpload,
} from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useUpdateSalarySlip } from "../../../hooks/useSalaryDetails";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatCurrency } from "../../../utils/currency";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import CardTable from "../../shared/CardTable";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import ShowHideButton from "../ui/ShowHideButton";
import InvoicePDFview from "./Component/InvoicePDFview";
import NoDataFound from "../../shared/atoms/NoDataFound";

const formatINR = (num: number) =>
  `${formatCurrency(num.toLocaleString("en-IN"))}`;

export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(true);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
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
  const handleUploadAndAttach = (file: File | null, invoiceName: string) => {
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
          },
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
      <div className="flex-shrink-0 max-sm:mb-2">
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
              <span></span>
            )}

            <ShowHideButton
              showAmount={hideAmount}
              onToggleAmount={() => setHideAmount((prev) => !prev)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {isLoading ? (
          <CardSkeleton />
        ) : invoices.length === 0 ? (
          <NoDataFound title="No Invoices Found" subtitle="No invoice records available." />
        ) : isDesktop ? (
          /* ================= DESKTOP TABLE ================= */
          <CardTable titles={titles} columnWidths={columnWidths}>
            {invoices.length === 0 ? (
              <div className="py-10 text-center text-gray-500 col-span-full">
                No invoices found
              </div>
            ) : (
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

                    <div className="flex justify-center">
                      <StatusBadge status={inv.invoice_status} />
                    </div>

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
                        ref={(el) => {
                          fileInputRefs.current[`desktop-${invoiceNo}`] = el;
                        }}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          handleUploadAndAttach(
                            e.target.files?.[0] || null,
                            invoiceNo,
                          );
                          e.target.value = "";
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Upload className="w-3.5 h-3.5" />}
                        onClick={() =>
                          fileInputRefs.current[`desktop-${invoiceNo}`]?.click()
                        }
                      >
                        Upload
                      </Button>
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
            )}
          </CardTable>
        ) : (
          /* ================= MOBILE CARDS ================= */
          <div className="space-y-3 px-1">
            {invoices.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No invoices found
              </div>
            ) : (
              invoices.map((inv: any, idx: number) => {
                const invoiceNo = inv.name;

                return (
                  <div
                    key={invoiceNo || idx}
                    className="cursor-pointer border-t-4 border-x border-b 
                    border-x-primary/20 border-b-primary/20 
                    shadow-sm border-primary bg-white rounded-xl"
                  >
                    <div className="p-4 flex flex-col gap-3 w-full">
                      {/* Row 1: Invoice No + Status */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <Typography variant="mobileCardLabel">
                            Invoice No
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {invoiceNo}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Typography variant="mobileCardLabel">
                            Status
                          </Typography>
                          <StatusBadge status={inv.invoice_status} />
                        </div>
                      </div>

                      {/* Row 2: Customer + Due Date */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <Typography variant="mobileCardLabel">
                            Customer
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {inv.employee_name}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <Typography variant="mobileCardLabel">
                            Invoice Date
                          </Typography>
                          <Typography variant="mobileCardValue">
                            {formatToIndianDate(inv.start_date)}
                          </Typography>
                        </div>
                      </div>

                      {/* Row 3: Sub Total + Total Amount */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <Typography variant="mobileCardLabel">
                            Sub Total
                          </Typography>
                          <Typography
                            variant="mobileCardValue"
                            className={amountClass}
                          >
                            {formatINR(inv.gross_pay || 0)}
                          </Typography>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <Typography variant="mobileCardLabel">
                            Total Amount
                          </Typography>
                          <Typography
                            variant="mobileCardValue"
                            className={amountClass}
                          >
                            {formatINR(inv.net_pay || 0)}
                          </Typography>
                        </div>
                      </div>

                      {/* Footer: Upload + View */}
                      <div className="flex gap-3 pt-2 border-t border-primary/10">
                        <input
                          ref={(el) => {
                            fileInputRefs.current[`mobile-${invoiceNo}`] = el;
                          }}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            handleUploadAndAttach(
                              e.target.files?.[0] || null,
                              invoiceNo,
                            );
                            e.target.value = "";
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          icon={<Upload className="w-3.5 h-3.5" />}
                          onClick={() =>
                            fileInputRefs.current[
                              `mobile-${invoiceNo}`
                            ]?.click()
                          }
                          className=""
                        >
                          Upload Proof
                        </Button>
                        <InvoicePDFview
                          invoiceID={invoiceNo}
                          disabled={false}
                          onClick={handleInvoiceClick}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
