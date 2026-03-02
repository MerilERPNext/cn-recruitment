/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useInvoiceSalarySlip } from "../../../hooks/payroll/usePerquisite";
import {
  useCurrentEmployeeAllDetails,
  useFileUpload,
} from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useUpdateSalarySlip } from "../../../hooks/useSalaryDetails";
import InvoicePDFview from "./Component/InvoicePDFview";
import { FileText } from "lucide-react";
import Button from "../../shared/atoms/Button";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatCurrency } from "../../../utils/currency";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import StatusBadge from "../../shared/atoms/statusBadge";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import ShowHideButton from "../ui/ShowHideButton";
import SearchInputWrapper from "../../shared/SearchBar";

const formatINR = (num: number) =>
  `${formatCurrency(num.toLocaleString("en-IN"))}`;

export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { isDesktop } = useScreenSize();

  const uploadMutation = useFileUpload();

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { data: invoiceData, isLoading } = useInvoiceSalarySlip(
    user?.employee || "",
    user?.company || ""
  );

  const invoices = Array.isArray(invoiceData) ? invoiceData : [];

  const filteredInvoices = invoices.filter((inv: any) => {
    const term = searchTerm.toLowerCase();
    return (
      inv.name?.toLowerCase().includes(term) ||
      inv.employee_name?.toLowerCase().includes(term) ||
      inv.invoice_status?.toLowerCase().includes(term)
    );
  });

  const hasSearchData = filteredInvoices.length > 0;
  console.log("Fetched invoices:", hasSearchData);
  const updateSalarySlipMutation = useUpdateSalarySlip();

  const handleInvoiceClick = (invoiceID: string) => {
    console.log("Clicked invoiceID:", invoiceID);
  };

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

            <div className="flex items-center gap-3">
              <ShowHideButton
                showAmount={hideAmount}
                onToggleAmount={() => setHideAmount((prev) => !prev)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {isLoading ? (
          <CardSkeleton />
        ) : isDesktop ? (
          <CardTable titles={titles} columnWidths={columnWidths}>
            <div className="flex items-center w-full border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
              <SearchInputWrapper
                searchTerm={searchTerm}
                handleSearch={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {invoices.length === 0 ? (
              <div className="flex justify-center items-center h-50 col-span-9">
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <FileText className="w-10 h-10 mx-auto text-blue-400 mb-3" />
                    <Typography variant="h4">No records found</Typography>
                    <Typography variant="bodySmall">
                      No invoice available.
                    </Typography>
                  </div>
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex justify-center items-center h-50 col-span-9">
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <FileText className="w-10 h-10 mx-auto text-blue-400 mb-3" />
                    <Typography variant="h4">Not Found</Typography>
                    <Typography variant="bodySmall">
                      No matching invoice found.
                    </Typography>
                  </div>
                </div>
              </div>
            ) : (
              filteredInvoices.map((inv: any, idx: number) => {
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
                            invoiceNo
                          );
                          e.target.value = "";
                        }}
                      />
                      {inv?.custom_attach ? (
                        <InvoicePDFview
                          invoiceID={invoiceNo}
                          disabled={false}
                          onClick={handleInvoiceClick}
                        />
                      ) : (
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
                      )}
                    </div>

                    <div className="flex justify-center">

                    </div>
                  </div>
                );
              })
            )}
          </CardTable>
        ) : (
          <div className="space-y-3 px-1">
            {!hasSearchData && searchTerm ? (
              <div className="flex justify-center items-center h-40">
                <Typography variant="bodySmall">Not found</Typography>
              </div>
            ) : (
              filteredInvoices.map((inv: any, idx: number) => {
                const invoiceNo = inv.name;

                return (
                  <div
                    key={invoiceNo || idx}
                    className="cursor-pointer border-t-4 border-x border-b 
                    border-x-primary/20 border-b-primary/20 
                    shadow-sm border-primary bg-white rounded-xl"
                  >
                    <div className="p-4 flex flex-col gap-3 w-full">
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
                              invoiceNo
                            );
                            e.target.value = "";
                          }}
                        />
                        {inv?.custom_attach ? (
                          <InvoicePDFview
                            invoiceID={invoiceNo}
                            disabled={false}
                            onClick={handleInvoiceClick}
                            className="w-full"
                          />
                        ) : (
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
                          >
                            Upload Proof
                          </Button>
                        )}
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
