/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo, useEffect } from "react";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { Card } from "../../shared/atoms/Card";
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import SalaryAssignmentHeader from "./PayPackageHeader";
import { CalendarDays } from "lucide-react";
import StatusBadge from "../../shared/atoms/statusBadge";
import { formatCurrency } from "../../../utils/currency";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import DataListView from "../../DataListView";

type SalaryItem = any;

type CTCComponentItem = {
  component?: string;
  type?: string;
  amount?: number;
  annual_amount?: number;
};

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
  if (showAmount) {
    return (
      <Typography variant="bodySmall" component="span" className="blur-sm select-none">
        {formatCurrency("XXXXX")}
      </Typography>
    );
  }
  if (value === undefined || value === null) return "—";
  return `${formatCurrency(Number(value).toLocaleString("en-IN"))}`;
};

const DesktopRow = ({ item, showAmount, onView, onVersions }: RowProps) => {
  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];
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
        {renderAmount(item.fixed_gross_monthly, showAmount)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {renderAmount(item.monthly_ctc, showAmount)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {renderAmount(item.fixed_gross_annual, showAmount)}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {renderAmount(item.annual_ctc, showAmount)}
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

const MobileRow = ({ item, showAmount, onView, onVersions }: RowProps) => (
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
            {renderAmount(item.fixed_gross_monthly, showAmount)}
          </Typography>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <Typography variant="mobileCardLabel">Monthly CTC</Typography>
          <Typography variant="mobileCardValue">
            {renderAmount(item.monthly_ctc, showAmount)}
          </Typography>
        </div>
      </div>

      {/* Row 3: Fixed Gross Annual + Annual CTC */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <Typography variant="mobileCardLabel">Fixed Gross Annual</Typography>
          <Typography variant="mobileCardValue">
            {renderAmount(item.fixed_gross_annual, showAmount)}
          </Typography>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <Typography variant="mobileCardLabel">Annual CTC</Typography>
          <Typography variant="mobileCardValue">
            {renderAmount(item.annual_ctc, showAmount)}
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

// ---- Main Component ----

export default function SalaryAssignmentList() {
  const { data: user } = useCurrentEmployeeAllDetails();

  const [selected, setSelected] = useState<SalaryItem | null>(null);
  const [selectedVersionItem, setSelectedVersionItem] =
    useState<SalaryItem | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [showAmount, setShowAmount] = useState(true);
  // filtersKey forces DataListView remount when period changes (same pattern as SalarySlipsList)
  const [filtersKey, setFiltersKey] = useState(0);

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null,
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
    if (selectedPeriod && user?.employee) {
      setFiltersKey((prev) => prev + 1);
    }
  }, [selectedPeriod, user?.employee]);

  // ---- customAPI config ----
  // DataListView will call this endpoint; params are merged in at request time.
  const customAPI = useMemo(() => {
    if (!user?.employee || !selectedPeriod || !user?.company) return null;

    return {
      method:
        "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_structure_assignment.generate_salary_slip",
      params: {
        employee: user.employee,
        payroll_period: selectedPeriod,
        company: user.company,
      },
    };
  }, [user?.employee, selectedPeriod, user?.company]);

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
    "Action",
  ];

  const columnWidths = ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

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

      <div className="flex-1 overflow-y-auto md:px-4 md:pb-20">
        {isDesktop ? (
          <CardTable
            titles={titles}
            columnWidths={columnWidths}
            columnSortConfig={SALARY_SORT_CONFIG}
          >
 
            {customAPI && (
              <DataListView<SalaryItem>
                key={filtersKey}
                queryKey={["pay-package", user?.employee || "", selectedPeriod || ""]}
                customAPI={customAPI}
                ItemComponent={ItemComponent}
                isSearch={true}
                showPagination={true}
                isFilter={true}
                filterFields={[  ]}
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
                queryKey={["pay-package", user?.employee || "", selectedPeriod]}
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
            className={`bg-white flex flex-col w-full ${
              isDesktop ? "max-w-[600px]" : ""
            } shadow-lg relative h-screen`}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <Typography variant="subheading" color="body1">
                CTC Breakdown
              </Typography>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-6 text-sm">
                <div className="flex justify-between">
                  <Typography
                    variant="bodySmall"
                    color="body1"
                    className="font-semibold"
                  >
                    Effective From
                  </Typography>
                  <div className="bg-success-100 rounded px-2 py-0.5 max-w-full flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    <Typography
                      variant="bodySmall"
                      color="success"
                      className="font-semibold"
                    >
                      {selected.from_date}
                    </Typography>
                  </div>
                </div>

                <Card className="grid gap-3 border border-gray-200 p-4 rounded">
                  <div className="flex justify-between">
                    <Typography variant="bodySmall" className="font-medium">
                      Fixed Gross Monthly CTC
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      color="body1"
                      className="font-semibold"
                    >
                      {renderAmount(selected.fixed_gross_monthly, showAmount)}
                    </Typography>
                  </div>

                  <div className="flex justify-between">
                    <Typography variant="bodySmall" className="font-medium">
                      Monthly CTC
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      color="body1"
                      className="font-semibold"
                    >
                      {renderAmount(selected.monthly_ctc, showAmount)}
                    </Typography>
                  </div>

                  <div className="flex justify-between">
                    <Typography variant="bodySmall" className="font-medium">
                      Fixed Gross Annual CTC
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      color="body1"
                      className="font-semibold"
                    >
                      {renderAmount(selected.fixed_gross_annual, showAmount)}
                    </Typography>
                  </div>

                  <div className="flex justify-between">
                    <Typography variant="bodySmall" className="font-medium">
                      Annual CTC
                    </Typography>
                    <Typography
                      variant="bodySmall"
                      color="body1"
                      className="font-semibold"
                    >
                      {renderAmount(selected.annual_ctc, showAmount)}
                    </Typography>
                  </div>
                </Card>

                <div className="space-y-6">
                  {/* Salary Components */}
                  <Typography
                    variant="bodyMedium"
                    color="body1"
                    className="font-semibold"
                  >
                    Salary Components
                  </Typography>

                  <Card className="space-y-3 border border-gray-200 rounded p-4">
                    {selected.component_part_of_ctc?.map(
                      (item: CTCComponentItem, index: number) => (
                        <div
                          key={item.component ?? index}
                          className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-baseline gap-1 min-w-0">
                            <Typography
                              variant="bodySmall"
                              className="font-medium"
                            >
                              {item.component}
                            </Typography>
                            <Typography variant="caption" color="body2">
                              ({item.type})
                            </Typography>
                          </div>

                          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0">
                            <Typography
                              variant="bodySmall"
                              className="font-medium whitespace-nowrap"
                            >
                              Annual: {renderAmount(item.amount, showAmount)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="body2"
                              className="whitespace-nowrap"
                            >
                              Monthly:{" "}
                              {renderAmount(
                                item.amount ? item.amount / 12 : undefined,
                                showAmount,
                              )}
                            </Typography>
                          </div>
                        </div>
                      ),
                    )}
                  </Card>

                  {/* Variable Pay Include CTC */}
                  {selected.variable_pay_include_ctc?.length > 0 && (
                    <>
                      <Typography
                        variant="bodyMedium"
                        color="body1"
                        className="font-semibold"
                      >
                        Variable Pay (Included in CTC)
                      </Typography>

                      <Card className="space-y-3 border border-gray-200 rounded p-4">
                        {selected.variable_pay_include_ctc.map(
                          (item: any, index: number) => (
                            <div
                              key={`include-${item.component ?? index}`}
                              className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0"
                            >
                              <div className="flex items-baseline gap-1 min-w-0">
                                <Typography
                                  variant="bodySmall"
                                  className="font-medium"
                                >
                                  {item.component}
                                </Typography>
                              </div>

                              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0">
                                <Typography
                                  variant="bodySmall"
                                  className="font-medium whitespace-nowrap"
                                >
                                  Annual:{" "}
                                  {renderAmount(item.annual_amount, showAmount)}
                                </Typography>
                              </div>
                            </div>
                          ),
                        )}
                      </Card>
                    </>
                  )}

                  {/* Variable Pay Exclude CTC */}
                  {selected.variable_pay_exclude_ctc?.length > 0 && (
                    <>
                      <Typography
                        variant="bodyMedium"
                        color="body1"
                        className="font-semibold"
                      >
                        Variable Pay (Excluded from CTC)
                      </Typography>

                      <Card className="space-y-3 border border-gray-200 rounded p-4">
                        {selected.variable_pay_exclude_ctc.map(
                          (item: any, index: number) => (
                            <div
                              key={`exclude-${item.component ?? index}`}
                              className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0"
                            >
                              <div className="flex items-baseline gap-1 min-w-0">
                                <Typography
                                  variant="bodySmall"
                                  className="font-medium"
                                >
                                  {item.component}
                                </Typography>
                              </div>

                              <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0">
                                <Typography
                                  variant="bodySmall"
                                  className="font-medium whitespace-nowrap"
                                >
                                  Annual:{" "}
                                  {renderAmount(item.annual_amount, showAmount)}
                                </Typography>
                              </div>
                            </div>
                          ),
                        )}
                      </Card>
                    </>
                  )}
                </div>
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