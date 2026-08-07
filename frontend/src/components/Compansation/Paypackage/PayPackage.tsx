/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo, useEffect } from "react";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { Card } from "../../shared/atoms/Card";
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import { useTargetEmployeeCompany } from "../../../hooks/useTargetEmployeeCompany";
import SalaryAssignmentHeader from "./PayPackageHeader";
import StatusBadge from "../../shared/atoms/statusBadge";
import { formatCurrency } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import DataListView from "../../DataListView";
import html2pdf from "html2pdf.js";
import { Download } from "lucide-react";

type SalaryItem = any;

type PayrollPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

// ---- Inner row components used by DataListView ----

type RowProps = {
  item: SalaryItem;
  showAmount: boolean;
  onView: (item: SalaryItem) => void;
  onVersions: (item: SalaryItem) => void;
};

const renderAmount = (value: number | string | undefined, showAmount: boolean) => {
  if (value === undefined || value === null || value === "") return "—";
  if (showAmount) {
    return (
      <Typography variant="bodySmall" component="span" className="blur-sm select-none">
        {formatCurrency("XXXXX")}
      </Typography>
    );
  }
  return `${formatCurrency(value)}`;
};

/**
 * Extracts flat display values from the nested API response arrays.
 * API returns: fixed_gross[0].monthly_amount, fixed_ctc[0].monthly_amount, etc.
 * We need:   fixed_gross_monthly, monthly_ctc, fixed_gross_annual, annual_ctc
 */
const getDisplayValues = (item: SalaryItem) => {
  const fixedGrossMonthly = item.fixed_gross?.[0]?.monthly_amount;
  const fixedGrossAnnual = item.fixed_gross?.[0]?.annual_amount;
  const monthlyCTC = item.fixed_ctc?.[0]?.monthly_amount;
  const annualCTC = item.total_final_ctc?.[0]?.annual_amount;
  const ctcCategory = item.custom_ctc_category;
  return { fixedGrossMonthly, fixedGrossAnnual, monthlyCTC, annualCTC, ctcCategory };
};

const renderRemark = (remark: string | undefined) => {
  if (!remark) return "—";
  
  if (remark.includes("↑") || remark.includes("↓")) {
    const parts = remark.split(/(↑|↓)/g);
    return (
      <span>
        {parts.map((part, idx) => {
          if (part === "↑") return <span key={idx} className="text-success font-bold text-base">↑</span>;
          if (part === "↓") return <span key={idx} className="text-error font-bold text-base">↓</span>;
          return part;
        })}
      </span>
    );
  }
  
  return remark;
};

const DesktopRow = ({ item, showAmount, onView, onVersions }: RowProps) => {
  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];
  const { fixedGrossMonthly, fixedGrossAnnual, monthlyCTC, annualCTC, ctcCategory } = getDisplayValues(item);
  return (
    <div
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      style={{ gridTemplateColumns: columnWidths.join(" ") }}
    >
      <Typography variant="bodySmall" className="font-medium text-center">
        {formatToIndianDate(item.from_date)}
      </Typography>

      <div className="flex items-center justify-center">
        <StatusBadge status={item.active === 1 ? "Active" : "Inactive"} />
      </div>

      <Typography variant="bodySmall" className="font-medium text-center">
        {renderAmount(fixedGrossMonthly, showAmount)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {renderAmount(monthlyCTC, showAmount)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {renderAmount(fixedGrossAnnual, showAmount)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {renderAmount(annualCTC, showAmount)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {renderRemark(ctcCategory)}
      </Typography>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onView(item)}
          className="text-primary border border-primary/40 px-2 py-0.5 rounded hover:bg-primary/20 text-sm font-medium"
        >
          View
        </button>
        <button
          onClick={() => onVersions(item)}
          className="text-primary border border-primary-300 px-2 py-0.5 rounded hover:bg-primary/20 text-sm font-medium"
        >
          Versions
        </button>
      </div>
    </div>
  );
};

const MobileRow = ({ item, showAmount, onView, onVersions }: RowProps) => {
  const { fixedGrossMonthly, fixedGrossAnnual, monthlyCTC, annualCTC, ctcCategory } = getDisplayValues(item);
  return (
    <div
      className="cursor-pointer border-t-4 border-x border-b 
      border-x-primary/20 border-b-primary/20 
      shadow-sm border-primary bg-white rounded-xl"
    >
      <div className="p-4 flex flex-col gap-3 w-full">
        {/* Row 1: Effective Date + Status */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Effective Date</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(item.from_date)}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Typography variant="mobileCardLabel">Status</Typography>
            <StatusBadge status={item.active === 1 ? "Active" : "Inactive"} />
          </div>
        </div>

        {/* Row 2: Fixed Gross Monthly + Monthly CTC */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Fixed Gross Monthly</Typography>
            <Typography variant="mobileCardValue">
              {renderAmount(fixedGrossMonthly, showAmount)}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Monthly CTC</Typography>
            <Typography variant="mobileCardValue">
              {renderAmount(monthlyCTC, showAmount)}
            </Typography>
          </div>
        </div>

        {/* Row 3: Fixed Gross Annual + Annual CTC */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Fixed Gross Annual</Typography>
            <Typography variant="mobileCardValue">
              {renderAmount(fixedGrossAnnual, showAmount)}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Annual CTC</Typography>
            <Typography variant="mobileCardValue">
              {renderAmount(annualCTC, showAmount)}
            </Typography>
          </div>
        </div>

        {/* Row 4: Remark */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Remark</Typography>
            <Typography variant="mobileCardValue">
              {renderRemark(ctcCategory)}
            </Typography>
          </div>
        </div>

        {/* Footer: View + Versions buttons */}
        <div className="flex gap-3 pt-2 border-t border-primary/10">
          <button
            onClick={() => onView(item)}
            className="flex-1 text-center text-primary border border-primary/40 px-3 py-1.5 rounded-lg hover:bg-primary/10 text-sm font-medium transition-colors"
          >
            View
          </button>
          <button
            onClick={() => onVersions(item)}
            className="flex-1 text-center text-primary border border-primary/40 px-3 py-1.5 rounded-lg hover:bg-primary/10 text-sm font-medium transition-colors"
          >
            Versions
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Main Component ----

export default function SalaryAssignmentList() {
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  // When an admin/HR is viewing another user, target their employee id.
  const effectiveEmployee = targetEmployeeId || user?.employee;
  const { targetCompany } = useTargetEmployeeCompany();
  const effectiveCompany = targetEmployeeId ? targetCompany : user?.company;

  const [selected, setSelected] = useState<SalaryItem | null>(null);
  const [selectedVersionItem, setSelectedVersionItem] =
    useState<SalaryItem | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [showAmount, setShowAmount] = useState(true);
  // filtersKey forces DataListView remount when period changes (same pattern as SalarySlipsList)
  const [filtersKey, setFiltersKey] = useState(0);

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    effectiveCompany ?? null,
  ) as {
    data: PayrollPeriod[] | undefined;
  };

  const { isDesktop } = useScreenSize();

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };

  const toggleAmount = () => {
    setShowAmount((prev) => !prev);
  };

  // ✅ Auto select current payroll period
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

  // ✅ Refresh list when period or employee changes
  useEffect(() => {
    if (selectedPeriod && effectiveEmployee) {
      setFiltersKey((prev) => prev + 1);
    }
  }, [selectedPeriod, effectiveEmployee]);

  // ---- customAPI config ----
  // DataListView will call this endpoint; params are merged in at request time.
  const customAPI = useMemo(() => {
    if (!effectiveEmployee || !selectedPeriod || !effectiveCompany) return null;

    return {
      method:
        "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_structure_assignment.generate_salary_slip",
      params: {
        employee: effectiveEmployee,
        payroll_period: selectedPeriod,
        company: effectiveCompany,
      },
    };
  }, [effectiveEmployee, selectedPeriod, effectiveCompany]);

  // ---- Sort config (identical to original) ----
  const SALARY_SORT_CONFIG: ColumnSortConfig[] = [
    {
      sortable: true,
      type: "date",
      field: "from_date",
      getValue: (item: any) => item.from_date ?? "",
    },
    {
      sortable: false,
    },
    {
      sortable: false,
    },
    {
      sortable: false,
    },
    {
      sortable: true,
      type: "number",
      field: "custom_fixed_gross_annual",
      getValue: (item: any) => item.fixed_gross_annual ?? 0,
    },
    {
      sortable: true,
      type: "number",
      field: "base",
      getValue: (item: any) => item.annual_ctc ?? 0,
    },
    {
      sortable: true,
      type: "string",
      field: "custom_ctc_category",
      getValue: (item: any) => item.custom_ctc_category ?? "",
    },
    {
      sortable: false, // Action column
    },
  ];

  const titles = [
    "Effective Date",
    "Status",
    "Fixed Gross Monthly",
    "Monthly CTC",
    "Fixed Gross Annual",
    "Annual CTC",
    "Remark",
    "Action",
  ];

  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  // ---- ItemComponent factory — closes over showAmount + modal setters ----
  const ItemComponent = useMemo(
    () =>
      ({ item }: { item: SalaryItem }) => {
        if (isDesktop) {
          return (
            <DesktopRow
              item={item}
              showAmount={showAmount}
              onView={setSelected}
              onVersions={setSelectedVersionItem}
            />
          );
        }
        return (
          <MobileRow
            item={item}
            showAmount={showAmount}
            onView={setSelected}
            onVersions={setSelectedVersionItem}
          />
        );
      },
    [isDesktop, showAmount],
  );

  return (
    <div className="flex flex-col h-full">
      {/* 🔹 Header ALWAYS visible */}
      <SalaryAssignmentHeader
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        payrollPeriods={payrollPeriods}
        isLoading={!customAPI} // show loading state while params aren't ready
        showAmount={showAmount}
        onToggleAmount={toggleAmount}
      />

      <div className="flex-1 overflow-y-auto md:px-4 pt-3 md:pt-4 md:pb-20">
        {isDesktop ? (
          <CardTable
            titles={titles}
            columnWidths={columnWidths}
            columnSortConfig={SALARY_SORT_CONFIG}
          >

            {customAPI && (
              <DataListView<SalaryItem>
                key={filtersKey}
                queryKey={["pay-package", effectiveEmployee || "", selectedPeriod || ""]}
                customAPI={customAPI}
                ItemComponent={ItemComponent}
                isSearch={true}
                showPagination={true}
                isFilter={true}
                filterFields={[]}
                infiniteScroll={false}
                SkeletonComponent={CardSkeleton}
                noRecordsScreen={
                  <NoDataFound
                    title="No Records Found"
                    subtitle="No pay package records available for this period."
                  />
                }
              />
            )}

            {/* Show skeleton while customAPI params are not yet ready */}
            {!customAPI && <CardSkeleton />}
          </CardTable>
        ) : (
          // Mobile: DataListView renders MobileRow cards directly, no CardTable wrapper
          <div className="space-y-1 px-1">
            {customAPI ? (
              <DataListView<SalaryItem>
                key={filtersKey}
                queryKey={["pay-package", effectiveEmployee || "", selectedPeriod]}
                customAPI={customAPI}
                ItemComponent={ItemComponent}
                isSearch={true}
                showPagination={false}
                isFilter={false}
                infiniteScroll={false}
                SkeletonComponent={CardSkeleton}
                noRecordsScreen={
                  <NoDataFound
                    title="No Records Found"
                    subtitle="No pay package records available for this period."
                  />
                }
              />
            ) : (
              <CardSkeleton />
            )}
          </div>
        )}
      </div>

      {/* ================= CTC MODAL ================= */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
          <div
            id="ctc-modal-content"
            className={`bg-white flex flex-col w-full ${isDesktop ? "max-w-[700px]" : ""
              } shadow-lg relative h-screen`}
          >
            <div className="flex justify-between items-start p-6 pb-2">
              <div className="flex flex-col gap-2">
                <Typography variant="subheading" color="body1" className="font-semibold text-lg">
                  CTC Proration
                </Typography>
                <Typography variant="bodySmall" color="body2">
                  Effective Date : {selected.from_date ? formatToIndianDate(selected.from_date) : "—"}
                </Typography>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-4" data-html2canvas-ignore="true">
                  <button
                    onClick={() => {
                      const element = document.getElementById("ctc-modal-content");
                      if (!element) return;
                      html2pdf()
                        .set({
                          margin: 10,
                          filename: `CTC_Proration_${selected.from_date || "date"}.pdf`,
                          html2canvas: { scale: 2 },
                          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                        })
                        .from(element)
                        .save();
                    }}
                    className="text-primary border border-primary/40 px-3 py-1.5 rounded-lg hover:bg-primary/10 text-sm font-medium transition-colors flex items-center gap-1.5"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-gray-500 hover:text-black"
                  >
                    ✕
                  </button>
                </div>
                <Typography variant="bodySmall" className="font-semibold mt-2">
                  Currency: INR
                </Typography>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700 w-[50%]">Earnings</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 text-center w-[25%]">Monthly</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 text-right w-[25%]">Annually</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Earnings */}
                    {selected.earning_part_of_ctc?.map((item: any, idx: number) => (
                      <tr key={`earn-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.component}</td>
                        <td className="px-4 py-3 text-center">{renderAmount(item.amount, showAmount)}</td>
                        <td className="px-4 py-3 text-right">{renderAmount(item.annual_amount, showAmount)}</td>
                      </tr>
                    ))}

                    {/* Fixed Gross */}
                    {selected.fixed_gross?.map((item: any, idx: number) => (
                      <tr key={`gross-${idx}`} className="bg-slate-50/70 font-semibold border-y border-gray-200">
                        <td className="px-4 py-3">{item.component}</td>
                        <td className="px-4 py-3 text-center">{renderAmount(item.monthly_amount, showAmount)}</td>
                        <td className="px-4 py-3 text-right">{renderAmount(item.annual_amount, showAmount)}</td>
                      </tr>
                    ))}

                    {/* Deductions */}
                    {selected.deduction_part_of_ctc?.map((item: any, idx: number) => (
                      <tr key={`ded-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.component}</td>
                        <td className="px-4 py-3 text-center">{renderAmount(item.amount, showAmount)}</td>
                        <td className="px-4 py-3 text-right">{renderAmount(item.annual_amount, showAmount)}</td>
                      </tr>
                    ))}

                    {/* Reimbursements */}
                    {selected.reimbursements_part_of_ctc?.map((item: any, idx: number) => (
                      <tr key={`reimb-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.component}</td>
                        <td className="px-4 py-3 text-center">{renderAmount(item.amount, showAmount)}</td>
                        <td className="px-4 py-3 text-right">{renderAmount(item.annual_amount, showAmount)}</td>
                      </tr>
                    ))}

                    {/* Fixed CTC */}
                    {selected.fixed_ctc?.map((item: any, idx: number) => (
                      <tr key={`fctc-${idx}`} className="bg-slate-50/70 font-semibold border-y border-gray-200">
                        <td className="px-4 py-3">{item.component}</td>
                        <td className="px-4 py-3 text-center">{renderAmount(item.monthly_amount, showAmount)}</td>
                        <td className="px-4 py-3 text-right">{renderAmount(item.annual_amount, showAmount)}</td>
                      </tr>
                    ))}

                    {/* Variable Pay Include/Exclude CTC */}
                    {selected.variable_pay_include_ctc?.map((item: any, idx: number) => (
                      <tr key={`varinc-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.component}</td>
                        <td className="px-4 py-3 text-center">{item.amount || item.monthly_amount ? renderAmount(item.amount || item.monthly_amount, showAmount) : "—"}</td>
                        <td className="px-4 py-3 text-right">{renderAmount(item.annual_amount, showAmount)}</td>
                      </tr>
                    ))}

                    {selected.variable_pay_exclude_ctc?.map((item: any, idx: number) => (
                      <tr key={`varexc-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.component}</td>
                        <td className="px-4 py-3 text-center">{item.amount || item.monthly_amount ? renderAmount(item.amount || item.monthly_amount, showAmount) : "—"}</td>
                        <td className="px-4 py-3 text-right">{renderAmount(item.annual_amount, showAmount)}</td>
                      </tr>
                    ))}

                    {/* Total Final CTC */}
                    {selected.total_final_ctc?.map((item: any, idx: number) => (
                      <tr key={`total-${idx}`} className="bg-slate-50/70 font-semibold border-y border-gray-200">
                        <td className="px-4 py-3">{item.component}</td>
                        <td className="px-4 py-3 text-center">{item.monthly_amount ? renderAmount(item.monthly_amount, showAmount) : "—"}</td>
                        <td className="px-4 py-3 text-right">{renderAmount(item.annual_amount, showAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VERSION MODAL ================= */}
      {selectedVersionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col bg-white w-full max-sm:h-[100vh] max-w-[900px] shadow-lg sm:rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <Typography variant="subheading">Version History</Typography>
              <button
                onClick={() => setSelectedVersionItem(null)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 sm:max-h-[70vh] flex-1 overflow-y-auto">
              {!selectedVersionItem.version?.length && (
                <Typography variant="bodySmall" color="body2">
                  No version history found.
                </Typography>
              )}

              {selectedVersionItem.version?.map((ver: any) => (
                <Card
                  key={ver.version_name}
                  className="border border-gray-200 rounded p-4 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <Typography variant="bodySmall" className="font-semibold">
                      Version: {ver.version_name}
                    </Typography>
                  </div>

                  {ver.values_changed?.map((chg: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-sm border-l-4 border-indigo-400 pl-3"
                    >
                      <Typography
                        variant="bodySmall"
                        color="body1"
                        className="font-medium"
                      >
                        {chg.property}
                      </Typography>
                      <Typography variant="bodySmall" color="body2">
                        Old:{" "}
                        <Typography
                          component="span"
                          variant="bodySmall"
                          color="body1"
                        >
                          {chg.old_value}
                        </Typography>
                      </Typography>
                      <Typography variant="bodySmall" color="body2">
                        New:{" "}
                        <Typography
                          component="span"
                          variant="bodySmall"
                          color="body1"
                        >
                          {chg.new_value}
                        </Typography>
                      </Typography>
                      <Typography variant="caption" className="mt-1">
                        {chg.modified} by {chg.modified_by}
                      </Typography>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}