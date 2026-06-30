/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
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
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import CustomDropdown from "../../shared/CustomDropdown";
import { useQueryClient } from "@tanstack/react-query";
import FrappeAPI from "../../../utils/frappeAPI";
import { RiDeleteBinLine } from "react-icons/ri";

type PayrollPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

const formatINR = (num: number) =>
  `${formatCurrency(num.toLocaleString("en-IN"))}`;

const titles = [
  "Invoice No",
  "Status",
  "Invoice Date",
  "Due Date",
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


export default function Invoice() {
  const [hideAmount, setHideAmount] = useState(true);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { isDesktop } = useScreenSize();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const uploadMutation = useFileUpload();
  const updateSalarySlipMutation = useUpdateSalarySlip();
  const queryClient = useQueryClient();
  const [deleteLoading, setDeleteLoading] = useState<Record<string, boolean>>({});

  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  // When an admin/HR is viewing another user, target their employee id.
  const effectiveEmployee = targetEmployeeId || user?.employee;
  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company || null,
  ) as {
    data: PayrollPeriod[] | undefined;
  };

  useEffect(() => {
    if (!payrollPeriods?.length || selectedPeriod) return;

    const today = new Date();

    const matchedPeriod = payrollPeriods.find((p) => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      return today >= start && today <= end;
    });

    setSelectedPeriod(matchedPeriod?.name || payrollPeriods[0].name);
  }, [payrollPeriods, selectedPeriod]);

  // ✅ Refresh list on filter change


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
              queryClient.invalidateQueries({
                queryKey: ["invoice-salary-slips", effectiveEmployee, user?.company],
              });
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

  const handleDeleteAttachment = async (invoiceName: string) => {
    if (!effectiveEmployee || !user?.company) return;
    setDeleteLoading((prev) => ({ ...prev, [invoiceName]: true }));
    if (!window.confirm('Are you sure you want to delete the attached file?')) {
      setDeleteLoading((prev) => ({ ...prev, [invoiceName]: false }));
      return;
    }
    try {
      // 1. Find the file document(s) attached to this Salary Slip
      const { data: files } = await FrappeAPI.getDocumentList("File", {
        filters: [
          ["attached_to_doctype", "=", "Salary Slip"],
          ["attached_to_name", "=", invoiceName],
        ],
        fields: ["name"],
      });

      // 2. Delete the file document using Resource API
      if (files && files.length > 0) {
        for (const file of files) {
          const fileDoc = file as { name: string };
          await FrappeAPI.deleteDocument("File", fileDoc.name);
        }
      }

      // 3. Clear the field in the Salary Slip document
      updateSalarySlipMutation.mutate(
        { salarySlipName: invoiceName, fileUrl: "" },
        {
          onSuccess() {
            toast.success("Attachment deleted successfully");
            queryClient.invalidateQueries({
              queryKey: ["invoice-salary-slips", effectiveEmployee, user.company],
            });
          },
          onError(err) {
            console.error("Salary Slip update failed", err);
            toast.error("Failed to clear attachment reference");
          },
          onSettled() {
            setDeleteLoading((prev) => ({ ...prev, [invoiceName]: false }));
          }
        }
      );
    } catch (err) {
      console.error("Failed to delete attachment", err);
      toast.error("Failed to delete attachment");
      setDeleteLoading((prev) => ({ ...prev, [invoiceName]: false }));
    }
  };

  // Don't render until we have employee + company info
  if (!effectiveEmployee || !user?.company) {
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
      employee: effectiveEmployee,
      company: user.company,
      payroll_period: selectedPeriod,
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(inv.custom_attach, "_blank")}
                >
                  View PDF
                </Button>
                <button
                  onClick={() => handleDeleteAttachment(invoiceNo)}
                  disabled={deleteLoading[invoiceNo]}
                  className="flex items-center justify-center p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  title="Delete Uploaded File"
                >
                  <RiDeleteBinLine className="w-4 h-4" />
                </button>
              </div>
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
              <div className="flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(inv.custom_attach, "_blank")}
                >
                  View PDF
                </Button>
                <button
                  onClick={() => handleDeleteAttachment(invoiceNo)}
                  disabled={deleteLoading[invoiceNo]}
                  className="flex items-center justify-center p-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors shrink-0"
                  title="Delete Uploaded File"
                >
                  <RiDeleteBinLine className="w-4 h-4" />
                </button>
              </div>
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
    <div className="flex flex-col h-full bg-app font-brand">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full">
        {/* Desktop top bar (hidden on mobile) */}
        {isDesktop && (
          <div className="sm:flex items-center justify-between h-[52px] px-7">
            <span className="font-bold text-[17px] text-text-title tracking-tight">Invoices</span>
            <div className="flex items-center gap-3.5">
              <ShowHideButton
                showAmount={hideAmount}
                onToggleAmount={() => setHideAmount((prev) => !prev)}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-text-body2">Payroll Period</span>
                <CustomDropdown
                  value={selectedPeriod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSelectedPeriod(e.target.value)
                  }
                  options={
                    payrollPeriods?.map((p) => ({
                      value: p.name,
                      label: p.name,
                    })) || []
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile top bar (hidden on sm+) */}
        {!isDesktop && (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[16px] text-text-title tracking-tight">My Invoices</span>
              <div className="flex items-center gap-2">
                <ShowHideButton
                  showAmount={hideAmount}
                  onToggleAmount={() => setHideAmount((prev) => !prev)}
                />
                <CustomDropdown
                  value={selectedPeriod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSelectedPeriod(e.target.value)
                  }
                  options={
                    payrollPeriods?.map((p) => ({
                      value: p.name,
                      label: p.name,
                    })) || []
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-visibles md:px-4 pb-5 md:pb-20">
        {isDesktop ? (
          <CardTable titles={titles} columnWidths={columnWidths} columnSortConfig={SALARY_SORT_CONFIG}>
            <DataListView
              queryKey={["invoice-salary-slips", effectiveEmployee, user.company]}
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
              queryKey={["invoice-salary-slips", effectiveEmployee, user.company]}
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