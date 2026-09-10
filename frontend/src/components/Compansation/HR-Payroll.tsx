"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { useTaxSheetPayrollPriodsData } from "../../hooks/useTaxSheet";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useNewRegime, useITDeclarationTabData } from "../../hooks/payroll/useITDeclaration";
import { usePayrollDocumentCategories } from "../../hooks/payroll/usePayrollDocument";
import { useScreenSize } from "../../hooks/useScreenSize";
import CustomDropdown from "../shared/CustomDropdown";
import CardTable, { ColumnSortConfig } from "../shared/CardTable";
import DataListView, { FilterField } from "../DataListView";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import { Typography } from "../shared/atoms/Typography";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { FilePreviewModal } from "../shared/molecules/FilePreviewModal";
import formatToIndianDate from "../../utils/formatToIndianDate";
import Form12B from "./IT Declaration/Component/Form12B";
import type { CustomAPIConfig } from "../../services/customApiService";
import type { PayrollDocument } from "../../types/payrollDocument";

type PayrollPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

const columnWidths = [
  "1.3fr",
  "1.5fr",
  "1.2fr",
  "1fr",
  "1fr",
  "1.2fr",
  "1.1fr",
];

const titles = [
  "Document",
  "Employee",
  "Category",
  "Month",
  "Period",
  "Created Date",
  "Action",
];

const PAYROLL_DOC_SORT_CONFIG: ColumnSortConfig[] = [
  {
    sortable: true,
    type: "string",
    field: "name",
    getValue: (item: PayrollDocument) => item.name ?? "",
  },
  {
    sortable: true,
    type: "string",
    field: "employee_name",
    getValue: (item: PayrollDocument) =>
      item.employee_name || item.employee || "",
  },
  {
    sortable: true,
    type: "string",
    field: "payroll_document_category",
    getValue: (item: PayrollDocument) => item.payroll_document_category ?? "",
  },
  {
    sortable: true,
    type: "string",
    field: "month",
    getValue: (item: PayrollDocument) => item.month ?? "",
  },
  {
    sortable: true,
    type: "string",
    field: "payroll_period",
    getValue: (item: PayrollDocument) => item.payroll_period ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "creation",
    getValue: (item: PayrollDocument) =>
      item.created_date || item.creation || 0,
  },
  { sortable: false },
];

// ─── Desktop Row Component ───────────────────────────────────────────────────
interface RowProps {
  item: PayrollDocument;
  categoryName: string;
  columnWidths: string[];
  onPreview: (url: string, name: string) => void;
  onDownload: (url: string, name: string) => void;
}

const DesktopRow: React.FC<RowProps> = ({
  item,
  categoryName,
  columnWidths: widths,
  onPreview,
  onDownload,
}) => {
  const fileUrl =
    item.attachment_url || item.attachment?.attachment_url || item.attach;
  const fileName = item.attachment?.file_name || item.name;

  return (
    <div
      className="grid items-center gap-4 px-6 h-14 border-b border-gray-100 hover:bg-gray-50/70 transition-colors font-brand"
      style={{ gridTemplateColumns: widths.join(" ") }}
    >
      {/* Document ID */}
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
        <Typography
          variant="bodySmall"
          color="title"
          className="font-medium truncate"
          title={item.name}
        >
          {item.name}
        </Typography>
      </div>

      {/* Employee with Hover Card */}
      <div
        className="flex justify-center min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <WrapperHoverCard employeeId={item.employee}>
          <Typography
            variant="bodySmall"
            color="primary"
            className="cursor-pointer font-medium hover:underline truncate max-w-[170px]"
            title={item.employee_name || item.employee}
          >
            {item.employee_name || item.employee}
          </Typography>
        </WrapperHoverCard>
      </div>

      {/* Category */}
      <div className="text-center">
        <span className="inline-block px-2.5 py-0.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-full">
          <Typography variant="bodySmall" className="text-xs font-medium text-blue-700">
            {categoryName}
          </Typography>
        </span>
      </div>

      {/* Month */}
      <div className="text-center">
        <Typography variant="bodySmall" color="body2">
          {item.month || "—"}
        </Typography>
      </div>

      {/* Period */}
      <div className="text-center">
        <Typography variant="bodySmall" color="body2" className="font-medium">
          {item.payroll_period || "—"}
        </Typography>
      </div>

      {/* Created Date */}
      <div className="text-center">
        <Typography variant="bodySmall" color="body2" className="text-xs">
          {item.created_date
            ? formatToIndianDate(item.created_date)
            : item.creation
              ? formatToIndianDate(item.creation)
              : "—"}
        </Typography>
      </div>

      {/* Action */}
      <div className="flex items-center justify-center gap-2">
        {fileUrl ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(fileUrl, fileName);
              }}
              title="Preview document"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary border border-primary/40 bg-primary/10 px-2.5 py-1 rounded-xl hover:bg-primary/20 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <Typography
                variant="bodySmall"
                color="primary"
                className="text-xs font-medium"
              >
                View
              </Typography>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(fileUrl, fileName);
              }}
              title="Download document"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 p-1.5 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <Typography variant="bodySmall" color="disabled" className="italic">
            —
          </Typography>
        )}
      </div>
    </div>
  );
};

// ─── Mobile Card Component ────────────────────────────────────────────────────
const MobileCard: React.FC<RowProps> = ({
  item,
  categoryName,
  onPreview,
  onDownload,
}) => {
  const fileUrl =
    item.attachment_url || item.attachment?.attachment_url || item.attach;
  const fileName = item.attachment?.file_name || item.name;

  return (
    <div className="cursor-pointer border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl mx-2 mb-3 mt-1 font-brand">
      <div className="p-4 flex flex-col gap-3 w-full">
        {/* Row 1: Document + Category */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 min-w-0">
            <Typography variant="mobileCardLabel">Document</Typography>
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <Typography
                variant="mobileCardValue"
                className="font-semibold text-text-title truncate"
                title={item.name}
              >
                {item.name}
              </Typography>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            <Typography variant="mobileCardLabel">Category</Typography>
            <span className="inline-block px-2.5 py-0.5 rounded-xl bg-blue-50 text-blue-700 font-medium border border-blue-100">
              <Typography variant="caption" className="text-blue-700 font-medium">
                {categoryName}
              </Typography>
            </span>
          </div>
        </div>

        {/* Row 2: Employee + Month */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 min-w-0">
            <Typography variant="mobileCardLabel">Employee</Typography>
            <WrapperHoverCard employeeId={item.employee}>
              <Typography
                variant="mobileCardValue"
                color="primary"
                className="cursor-pointer font-medium hover:underline truncate block"
                title={item.employee_name || item.employee}
              >
                {item.employee_name || item.employee}
              </Typography>
            </WrapperHoverCard>
          </div>
          <div className="flex flex-col gap-1 text-right flex-shrink-0">
            <Typography variant="mobileCardLabel">Month</Typography>
            <Typography variant="mobileCardValue">
              {item.month || "—"}
            </Typography>
          </div>
        </div>

        {/* Row 3: Period + Created Date */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Period</Typography>
            <Typography variant="mobileCardValue">
              {item.payroll_period || "—"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Created Date</Typography>
            <Typography variant="mobileCardValue">
              {item.created_date
                ? formatToIndianDate(item.created_date)
                : item.creation
                  ? formatToIndianDate(item.creation)
                  : "—"}
            </Typography>
          </div>
        </div>

        {/* Row 4: Action Buttons Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-primary/10">
          {fileUrl ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(fileUrl, fileName);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/40 bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <Typography
                  variant="bodySmall"
                  color="primary"
                  className="text-xs font-medium"
                >
                  Preview
                </Typography>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(fileUrl, fileName);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <Typography
                  variant="bodySmall"
                  color="body1"
                  className="text-xs font-medium"
                >
                  Download
                </Typography>
              </button>
            </>
          ) : (
            <Typography variant="caption" color="disabled" className="italic">
              No attachment
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PayrollDocuments: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId } = useTargetUser();
  const { data: user, isLoading: isUserLoading } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const effectiveEmployee = targetEmployeeId || user?.employee || "";
  const effectiveCompany = user?.company;

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null
  ) as {
    data: PayrollPeriod[] | undefined;
  };

  const { data: categoriesData } = usePayrollDocumentCategories();
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesData?.data || []).forEach((c) => {
      map.set(c.name, c.document_category);
    });
    return map;
  }, [categoriesData]);

  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
  } | null>(null);

  // Initial payroll period auto-selection
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

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };

  // Form 12B resolution
  const newRegimeResponse = useNewRegime(
    effectiveEmployee || null,
    user?.company || null,
    selectedPeriod || null
  ).data as
    | { declaration_id?: string; go_head_with_new_regime?: 0 | 1 }
    | undefined;
  const declarationId = newRegimeResponse?.declaration_id;
  const goHeadWithNewRegime = newRegimeResponse?.go_head_with_new_regime;
  const goHeadWithNewRegimeBool = goHeadWithNewRegime === 1;

  const { data: responseData } = useITDeclarationTabData(
    goHeadWithNewRegimeBool,
    effectiveEmployee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data?: { doctype?: string; proof_id?: string } };

  const declarationDoctype = responseData?.doctype;
  const proofId = responseData?.proof_id;
  const declarationIdFromITDeclaration = proofId || declarationId;

  // Custom API configuration for DataListView
  const customAPI: CustomAPIConfig | null = useMemo(() => {
    if (!effectiveEmployee) return null;
    return {
      method:
        "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.payroll_documents.get_payroll_document_list",
      params: {
        employee: effectiveEmployee,
        ...(selectedPeriod ? { payroll_period: selectedPeriod } : {}),
        ...(effectiveCompany ? { company: effectiveCompany } : {}),
      },
      searchFields: [
        "name",
        "payroll_document_category",
        "month",
        "employee_name",
        "payroll_period",
      ],
    };
  }, [effectiveEmployee, selectedPeriod, effectiveCompany]);

  // Filter fields configuration
  const filterFields: FilterField[] = useMemo(() => {
    const fields: FilterField[] = [];
    if (categoriesData?.data && categoriesData.data.length > 0) {
      fields.push({
        fieldname: "payroll_document_category",
        label: "Category",
        fieldtype: "Select",
        options: categoriesData.data.map((cat) => ({
          label: cat.document_category,
          value: cat.name,
        })),
        clearable: true,
      });
    }

    fields.push({
      fieldname: "month",
      label: "Month",
      fieldtype: "Select",
      options: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      clearable: true,
    });

    return fields;
  }, [categoriesData]);

  const handleDownload = (fileUrl: string, fileName?: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName || fileUrl.split("/").pop() || "document";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (fileUrl: string, fileName: string) => {
    setPreviewFile({ url: fileUrl, name: fileName });
  };

  return (
    <div className="bg-app min-h-screen font-brand flex flex-col">
      {/* Sticky Top Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full">
        {isDesktop ? (
          <div className="flex items-center justify-between h-[52px] px-7">
            <Typography
              variant="subheading"
              color="title"
              className="font-bold text-[17px] tracking-tight"
            >
              Payroll Documents
            </Typography>

            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-2">
                <Typography
                  variant="bodySmall"
                  color="body2"
                  className="text-[13px] whitespace-nowrap"
                >
                  Payroll Period:
                </Typography>
                <CustomDropdown
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                  position="bottom-right"
                  options={
                    payrollPeriods?.map((p) => ({
                      value: p.name,
                      label: p.name,
                    })) || []
                  }
                />
              </div>

              {declarationIdFromITDeclaration ? (
                <Form12B
                  declarationId={declarationIdFromITDeclaration}
                  docName={declarationDoctype}
                  disabled={false}
                />
              ) : (
                <Typography
                  variant="caption"
                  color="disabled"
                  className="italic bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 whitespace-nowrap"
                >
                  No declaration for Form 12B
                </Typography>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2">
            <div className="flex items-center justify-between gap-2">
              <Typography
                variant="subheading"
                color="title"
                className="font-bold text-[16px] tracking-tight whitespace-nowrap"
              >
                Payroll Documents
              </Typography>
              <CustomDropdown
                value={selectedPeriod}
                onChange={handlePeriodChange}
                position="bottom-right"
                options={
                  payrollPeriods?.map((p) => ({
                    value: p.name,
                    label: p.name,
                  })) || []
                }
              />
            </div>

            {declarationIdFromITDeclaration ? (
              <div className="flex justify-end">
                <Form12B
                  declarationId={declarationIdFromITDeclaration}
                  docName={declarationDoctype}
                  disabled={false}
                />
              </div>
            ) : (
              <div className="flex justify-end">
                <Typography
                  variant="caption"
                  color="disabled"
                  className="italic bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 text-[11px] whitespace-nowrap"
                >
                  No declaration for Form 12B
                </Typography>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isDesktop ? (
        <div className="flex-1 overflow-y-auto md:px-6 pt-3 md:pt-4 pb-16">
          <div className="mb-4">
            <Typography variant="h4" color="title" className="font-bold tracking-tight">
              Payroll Documents
            </Typography>
            <Typography variant="bodySmall" color="body2" className="mt-0.5 block">
              View and manage payroll documents and tax forms
            </Typography>
          </div>

          <CardTable
            titles={titles}
            columnWidths={columnWidths}
            columnSortConfig={PAYROLL_DOC_SORT_CONFIG}
          >
            {isUserLoading ? (
              <CardSkeleton />
            ) : !effectiveEmployee ? (
              <NoDataFound
                title="No Employee Selected"
                subtitle="Please select an employee or wait for user details to load."
              />
            ) : !selectedPeriod ? (
              <div className="flex items-center justify-center py-16 text-sm text-text-body2">
                Select a payroll period to view payroll documents.
              </div>
            ) : !customAPI ? (
              <CardSkeleton />
            ) : (
              <DataListView<PayrollDocument>
                queryKey={[
                  "payroll-documents",
                  effectiveEmployee,
                  selectedPeriod,
                  effectiveCompany || "",
                ]}
                customAPI={customAPI}
                isSearch={true}
                isFilter={true}
                filterFields={filterFields}
                showPagination={true}
                pageSize={10}
                SkeletonComponent={CardSkeleton}
                noRecordsScreen={
                  <NoDataFound
                    title="No Payroll Documents Found"
                    subtitle="No payroll documents found for the selected period and criteria."
                  />
                }
                ItemComponent={({ item }) => (
                  <DesktopRow
                    item={item}
                    categoryName={
                      categoryMap.get(item.payroll_document_category) ||
                      item.payroll_document_category ||
                      "—"
                    }
                    columnWidths={columnWidths}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                  />
                )}
              />
            )}
          </CardTable>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-1 pt-2 pb-16">
          {isUserLoading ? (
            <CardSkeleton />
          ) : !effectiveEmployee ? (
            <NoDataFound
              title="No Employee Selected"
              subtitle="Please select an employee or wait for user details to load."
            />
          ) : !selectedPeriod ? (
            <div className="flex items-center justify-center py-16 text-sm text-text-body2">
              Select a payroll period to view payroll documents.
            </div>
          ) : !customAPI ? (
            <CardSkeleton />
          ) : (
            <DataListView<PayrollDocument>
              queryKey={[
                "payroll-documents",
                effectiveEmployee,
                selectedPeriod,
                effectiveCompany || "",
              ]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={true}
              filterFields={filterFields}
              showPagination={true}
              pageSize={10}
              SkeletonComponent={CardSkeleton}
              noRecordsScreen={
                <NoDataFound
                  title="No Payroll Documents Found"
                  subtitle="No payroll documents found for the selected period and criteria."
                />
              }
              ItemComponent={({ item }) => (
                <MobileCard
                  item={item}
                  categoryName={
                    categoryMap.get(item.payroll_document_category) ||
                    item.payroll_document_category ||
                    "—"
                  }
                  columnWidths={columnWidths}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                />
              )}
            />
          )}
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default PayrollDocuments;
