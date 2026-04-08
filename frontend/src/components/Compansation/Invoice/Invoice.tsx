/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import InvoicePDFview from "./Component/InvoicePDFview";
import Button from "../../shared/atoms/Button";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatCurrency } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { useFileUpload } from "../../../hooks/useEmployee";
import toast from "react-hot-toast";
import { useUpdateSalarySlip } from "../../../hooks/useSalaryDetails";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import StatusBadge from "../../shared/atoms/statusBadge";
import ShowHideButton from "../ui/ShowHideButton";
import { IoMdCloudUpload } from "react-icons/io";
import DataListView from "../../DataListView";
import NoDataFound from "../../shared/atoms/NoDataFound";

const formatINR = (num: number) =>
  `${formatCurrency(num.toLocaleString("en-IN"))}`;

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


export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(true);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { isDesktop } = useScreenSize();

  const uploadMutation = useFileUpload();
  const updateSalarySlipMutation = useUpdateSalarySlip();

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const amountClass = hideAmount
    ? "blur-sm select-none pointer-events-none"
    : "";

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
          { salarySlipName: invoiceName, fileUrl },
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

  // Don't render until we have employee + company info
  if (!user?.employee || !user?.company) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 max-sm:mb-2">
          <div className="px-1 md:px-6 py-1 md:py-4">
            <Typography variant="h4">
              {isDesktop ? "Invoices" : "My Invoices"}
            </Typography>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const customAPI = {
    method:
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_slip_list.get_salary_slip_list",
    params: {
      employee: user.employee,
      company: user.company,
    },
  };
  const SALARY_SORT_CONFIG: ColumnSortConfig[] = [
    {
      sortable: true,
      type: "string",
      field: "name",
      getValue: (item: any) => item.name ?? "",
    },
    {
      sortable: false,
    },
    {
      sortable: true,
      type: "date",
      field: "start_date",
      getValue: (item: any) => item.start_date ?? "",
    },
    {
      sortable: true,
      type: "date",
      field: "end_date",
      getValue: (item: any) => item.end_date ?? "",
    },
    {
      sortable: true,
      type: "string",
      field: "employee_name",
      getValue: (item: any) => item.employee_name ?? "",
    },
    {
      sortable: true,
      type: "number",
      field: "gross_pay",
      getValue: (item: any) => item.gross_pay ?? 0,
    },
    {
      sortable: true,
      type: "number",
      field: "net_pay",
      getValue: (item: any) => item.net_pay ?? 0,
    },
    {
      sortable: false, // Attach Proof
    },
    {
      sortable: false, // Action
    },
  ];
  const renderInvoiceRow = (inv: any) => {
    const invoiceNo = inv.name;

    if (isDesktop) {
      return (
        <div
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
            {inv?.custom_attach ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(inv.custom_attach, "_blank")}
              >
                View PDF
              </Button>
            ) : (
              <>
                <input
                  ref={(el) => {
                    fileInputRefs.current[`desktop-${invoiceNo}`] = el;
                  }}
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => {
                    handleUploadAndAttach(
                      e.target.files?.[0] || null,
                      invoiceNo
                    );
                    e.target.value = "";
                  }}
                />
                <button
                  className="flex items-center gap-1 px-3 py-1 rounded-md border-2 border-dashed border-gray-200 text-gray-600 text-sm hover:bg-primary/10"
                  onClick={() =>
                    fileInputRefs.current[`desktop-${invoiceNo}`]?.click()
                  }
                >
                  <IoMdCloudUpload className="w-4 h-4" /> Upload
                </button>
              </>
            )}
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
    }

    // Mobile card
    return (
      <div
        className="cursor-pointer border-t-4 border-x border-b 
          border-x-primary/20 border-b-primary/20 
          shadow-sm border-primary bg-white rounded-xl"
      >
        <div className="p-4 flex flex-col gap-3 w-full">
          {/* Row 1: Invoice No + Status */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Invoice No</Typography>
              <Typography variant="mobileCardValue">{invoiceNo}</Typography>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <Typography variant="mobileCardLabel">Status</Typography>
              <StatusBadge status={inv.invoice_status} />
            </div>
          </div>

          {/* Row 2: Customer + Invoice Date */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Customer</Typography>
              <Typography variant="mobileCardValue">
                {inv.employee_name}
              </Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel">Invoice Date</Typography>
              <Typography variant="mobileCardValue">
                {formatToIndianDate(inv.start_date)}
              </Typography>
            </div>
          </div>

          {/* Row 3: Sub Total + Total Amount */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Sub Total</Typography>
              <Typography
                variant="mobileCardValue"
                className={amountClass}
              >
                {formatINR(inv.gross_pay || 0)}
              </Typography>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel">Total Amount</Typography>
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
            {inv?.custom_attach ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(inv.custom_attach, "_blank")}
              >
                View PDF
              </Button>
            ) : (
              <>
                <input
                  ref={(el) => {
                    fileInputRefs.current[`mobile-${invoiceNo}`] = el;
                  }}
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) => {
                    handleUploadAndAttach(
                      e.target.files?.[0] || null,
                      invoiceNo
                    );
                    e.target.value = "";
                  }}
                />
                <button
                  className="flex w-full justify-center items-center gap-1 px-3 py-1 rounded-md border-2 border-dashed border-gray-200 text-gray-600 text-sm hover:bg-primary/10"
                  onClick={() =>
                    fileInputRefs.current[`mobile-${invoiceNo}`]?.click()
                  }
                >
                  <IoMdCloudUpload className="w-3.5 h-3.5" /> Upload
                </button>
              </>
            )}
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
  };

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
              <Typography variant="h4">My Invoices</Typography>
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
        {isDesktop ? (
          <CardTable titles={titles} columnWidths={columnWidths} columnSortConfig={SALARY_SORT_CONFIG}>
            <DataListView
              queryKey={["invoice-salary-slips", user.employee, user.company]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={true}
              showPagination={true}
              SkeletonComponent={CardSkeleton}
              renderItem={(inv: any) => renderInvoiceRow(inv)}
              noRecordsScreen={
               <NoDataFound
                    title="No Records Found"
                    subtitle="No pay package records available for this period."
                  />
              }
            />
          </CardTable>
        ) : (
          <div className="space-y-3 px-1">
            <DataListView
              queryKey={["invoice-salary-slips", user.employee, user.company]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={true}
              showPagination={true}
              SkeletonComponent={CardSkeleton}
              renderItem={(inv: any) => renderInvoiceRow(inv)}
              noRecordsScreen={
                <NoDataFound
                     title="No Records Found"
                     subtitle="No pay package records available for this period."
                   />
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}