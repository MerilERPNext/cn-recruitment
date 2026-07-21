/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { formatCurrency } from "../../../utils/currency";
import StatusBadge from "../../shared/atoms/statusBadge";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import { Card } from "../../shared/atoms/Card";
import DataListView from "../../DataListView"; // ← adjust path as needed
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import formatToIndianDate from "../../../utils/formatToIndianDate";


// ─── Raw API shape ────────────────────────────────────────────────────────────
interface ApiPerquisiteItem {
  name: string;
  salary_component: string;
  amount: number;
  is_tax_applicable: number;
  payment_date: string;
}

// ─── UI shape ────────────────────────────────────────────────────────────────
interface UiPerquisite {
  id: string;
  name: string;
  taxableValue: number;
  status: string;
  description: string;
  paymentDate: string;
  details: {
    paymentDate: string;
    taxApplicable: boolean;
    referenceNo: string;
  };
}

// ─── Mapper ──────────────────────────────────────────────────────────────────
const mapPerquisiteData = (rawData: ApiPerquisiteItem[]): UiPerquisite[] => {
  if (!Array.isArray(rawData)) return [];
  return rawData.map((item) => ({
    id: item.name,
    name: item.salary_component,
    taxableValue: item.amount,
    status: item.is_tax_applicable === 1 ? "Paid" : "Not Paid",
    description: `Payment Date: ${item.payment_date}`,
    paymentDate: item.payment_date,
    details: {
      paymentDate: item.payment_date,
      taxApplicable: item.is_tax_applicable === 1,
      referenceNo: item.name,
    },
  }));
};
// console.log("Mapped Perquisite Data:", rowData)
const PERQUISITE_SORT_CONFIG: ColumnSortConfig[] = [
  { sortable: true, type: "string", field: "salary_component", getValue: (item: any) => item.name ?? "" },
  { sortable: true, type: "date", field: "payroll_date", getValue: (item: any) => item.paymentDate ?? 0 },
  { sortable: true, type: "number", field: "amount", getValue: (item: any) => item.taxableValue ?? 0 },
  { sortable: false, },
  { sortable: false },
];

// ─── Perquisites Calendar (monthly pivot) ──────────────────────────────────────
interface CalendarRow {
  id: string;
  name: string;
  monthly: Record<string, number>;
  total: number;
}

// The 12 months of the current Indian financial year (April → March), each as
// "YYYY-MM" (e.g. "2026-04" … "2027-03") — the calendar's column headers.
const getFinancialYearMonths = (ref: Date = new Date()): string[] => {
  const fyStartYear =
    ref.getMonth() + 1 >= 4 ? ref.getFullYear() : ref.getFullYear() - 1;
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(fyStartYear, 3 + i, 1); // month index 3 = April
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
};

// Pivot the flat perquisite-payment rows into one row per component, summing the
// amount into each month bucket (and a running total across the FY months).
const mapPerquisiteCalendar = (
  rawData: ApiPerquisiteItem[],
  months: string[],
): CalendarRow[] => {
  if (!Array.isArray(rawData)) return [];
  const rows = new Map<string, CalendarRow>();
  for (const item of rawData) {
    const monthKey = (item.payment_date || "").slice(0, 7); // "YYYY-MM"
    let row = rows.get(item.salary_component);
    if (!row) {
      row = {
        id: item.salary_component,
        name: item.salary_component,
        monthly: Object.fromEntries(months.map((m) => [m, 0])),
        total: 0,
      };
      rows.set(item.salary_component, row);
    }
    const amount = item.amount || 0;
    if (monthKey in row.monthly) {
      row.monthly[monthKey] += amount;
      row.total += amount;
    }
  }
  return Array.from(rows.values());
};

// Column template shared by the calendar header + rows: component name, 12
// months, then Total.
const CALENDAR_GRID_COLS =
  "minmax(150px,1.4fr) repeat(12, minmax(80px,1fr)) minmax(110px,1fr)";

export default function PerquisiteList() {
  const [selectedPerquisite, setSelectedPerquisite] = useState<UiPerquisite | null>(null);

  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  const { isDesktop } = useScreenSize();

  const employeeId = targetEmployeeId || user?.employee || "";
  const company = user?.company ?? "";

  const titles = ["Perquisite Name", "Payment Date", "Taxable Value", "Status", "Action"];
  const columnWidths = ["0.5fr", "1.2fr", "1.2fr", "1fr", "1fr"];

  // Only build customAPI when both employeeId and company are ready
  const customAPI = employeeId && company
    ? {
      method:
        "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.perquisite_payment.get_perquisite_payment_list",
      params: { employee: employeeId, company },
    }
    : null;

  // Client-side sort applied after DataListView gives us mapped data

  // Current financial-year months for the Perquisites Calendar columns.
  const fyMonths = getFinancialYearMonths();

  return (
    <div className="w-full bg-app font-brand flex flex-col min-h-screen">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full">
        {/* Desktop top bar (hidden on mobile) */}
        {isDesktop && (
          <div className="sm:flex items-center justify-between h-[52px] px-7">
            <span className="font-bold text-[17px] text-text-title tracking-tight">Employee Perquisite</span>
            <div className="flex items-center gap-3.5">
              {/* No other buttons inside header */}
            </div>
          </div>
        )}

        {/* Mobile top bar (hidden on sm+) */}
        {!isDesktop && (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[16px] text-text-title tracking-tight">Employee Perquisite</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 lg:p-4 p-2">

      {isDesktop ? (
        /* ================= DESKTOP ================= */
        <CardTable
          titles={titles}
          columnWidths={columnWidths}
          columnSortConfig={PERQUISITE_SORT_CONFIG}

        >
          {!customAPI ? (
            <CardSkeleton />
          ) : (
            <DataListView<UiPerquisite>
              queryKey={["perquisites", employeeId, company]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={false}
              showPagination={true}
              SkeletonComponent={CardSkeleton}
              clientFilterFn={(rawData) =>
                mapPerquisiteData(rawData as unknown as ApiPerquisiteItem[])
              }
              noRecordsScreen={
                <NoDataFound
                  title="No Perquisites Found"
                  subtitle="No perquisite records available."
                />
              }
              renderItem={(item: UiPerquisite) => (
                <div
                  key={item.id}
                  className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 cursor-pointer hover:bg-primary/10"
                  style={{ gridTemplateColumns: columnWidths.join(" ") }}
                >
                  <Typography variant="bodySmall" className="font-medium text-center">
                    {item.name}
                  </Typography>

                  <Typography variant="bodySmall" className="font-medium text-center">
                    {formatToIndianDate(item.paymentDate)}
                  </Typography>

                  <Typography variant="bodySmall" className="font-medium text-center">
                    {formatCurrency(item.taxableValue)}
                  </Typography>

                  <div className="font-medium items-center flex justify-center">
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="font-medium items-center flex justify-center">
                    <button
                      onClick={() => setSelectedPerquisite(item)}
                      className="text-[13px] font-medium text-primary border border-primary/40 
                      bg-primary-20 px-3 py-0.5 rounded-lg hover:bg-primary/40 
                      hover:border-primary/60 hover:text-primary-800 transition-colors duration-150"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )}
            />
          )}
        </CardTable>
      ) : (
        /* ================= MOBILE ================= */
        <>
          {!customAPI ? (
            <CardSkeleton />
          ) : (
            <DataListView<UiPerquisite>
              queryKey={["perquisites", employeeId, company]}
              customAPI={customAPI}
              isSearch={true}
              isFilter={true}
              showPagination={true}
              SkeletonComponent={CardSkeleton}
              clientFilterFn={(rawData) =>
                mapPerquisiteData(rawData as unknown as ApiPerquisiteItem[])
              }
              noRecordsScreen={
                <NoDataFound
                  title="No Perquisites Found"
                  subtitle="No perquisite records available."
                />
              }
              renderItem={(item: UiPerquisite) => (
                <div
                  key={item.id}
                  className="cursor-pointer border-t-4 border-x border-b mt-2
                    border-x-primary/20 border-b-primary/20
                    shadow-sm border-primary bg-white rounded-xl"
                  onClick={() => setSelectedPerquisite(item)}
                >
                  <div className="p-4 flex flex-col gap-3 w-full">
                    {/* Header: Perquisite Name + Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel">Perquisite Name</Typography>
                        <Typography variant="mobileCardValue">{item.name}</Typography>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    {/* Amount Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <Typography variant="mobileCardLabel">Taxable Value</Typography>
                        <Typography variant="mobileCardValue">
                          {formatCurrency(item.taxableValue)}
                        </Typography>
                      </div>
                    </div>

                    <div className="w-full flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPerquisite(item);
                        }}
                        className="text-[13px] font-medium text-primary border border-primary/40 
                        bg-primary-20 px-3 py-1 rounded-lg hover:bg-primary/40 
                        hover:border-primary/60 hover:text-primary-800 transition-colors duration-150"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </>
      )}

      {/* ================= PERQUISITES CALENDAR ================= */}
      {customAPI && (
        <div className="mt-8">
          <span className="font-bold text-[16px] text-text-title tracking-tight">
            Perquisites Calendar
          </span>
          <div className="mt-3 bg-white rounded-lg border border-gray-100 overflow-x-auto">
            <div style={{ minWidth: 1300 }}>
              {/* Header row */}
              <div
                className="grid items-center gap-2 px-6 h-12 bg-gray-50 border-b border-gray-100 text-center"
                style={{ gridTemplateColumns: CALENDAR_GRID_COLS }}
              >
                <Typography variant="bodySmall" className="font-semibold text-left">
                  Perquisites
                </Typography>
                {fyMonths.map((m) => (
                  <Typography key={m} variant="bodySmall" className="font-semibold">
                    {m}
                  </Typography>
                ))}
                <Typography variant="bodySmall" className="font-semibold">
                  Total
                </Typography>
              </div>

              {/* Rows — pivoted from the same perquisite payment data */}
              <DataListView<CalendarRow>
                queryKey={["perquisites-calendar", employeeId, company]}
                customAPI={customAPI}
                isSearch={false}
                isFilter={false}
                showPagination={false}
                pageSize={500}
                SkeletonComponent={CardSkeleton}
                clientFilterFn={(rawData) =>
                  mapPerquisiteCalendar(
                    rawData as unknown as ApiPerquisiteItem[],
                    fyMonths,
                  )
                }
                noRecordsScreen={
                  <NoDataFound
                    title="No Perquisites Found"
                    subtitle="No perquisite records available."
                  />
                }
                renderItem={(row: CalendarRow) => (
                  <div
                    key={row.id}
                    className="grid items-center gap-2 px-6 h-14 border-b border-gray-50 text-center"
                    style={{ gridTemplateColumns: CALENDAR_GRID_COLS }}
                  >
                    <Typography variant="bodySmall" className="font-medium text-left">
                      {row.name}
                    </Typography>
                    {fyMonths.map((m) => (
                      <Typography key={m} variant="bodySmall" className="font-medium">
                        {row.monthly[m] ? formatCurrency(row.monthly[m]) : "0"}
                      </Typography>
                    ))}
                    <Typography variant="bodySmall" className="font-semibold">
                      {row.total ? formatCurrency(row.total) : "0"}
                    </Typography>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= DETAILS MODAL ================= */}
      {selectedPerquisite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="rounded-2xl w-full max-w-lg p-6 relative mx-4">
            <button
              onClick={() => setSelectedPerquisite(null)}
              className="absolute top-4 right-4 text-gray-500"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-semibold">{selectedPerquisite.name}</h2>

            <p className="text-sm text-gray-500 mb-3 font-bold">
              Taxable Value: {formatCurrency(selectedPerquisite.taxableValue)}
            </p>

            <p className="text-sm text-gray-600 mb-4 font-bold">
              {selectedPerquisite.description}
            </p>

            <div className="bg-app rounded-xl p-4 text-sm">
              <h3 className="font-medium mb-2">Perquisite Details</h3>
              <ul className="space-y-2">
                {Object.entries(selectedPerquisite.details).map(([key, value]) => (
                  <li
                    key={key}
                    className="flex justify-between border-b last:border-b-0 pb-1"
                  >
                    <span className="text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span
                      className={`font-medium ${typeof value === "boolean"
                        ? value
                          ? "bg-success-100 text-success"
                          : "bg-error-100 text-error"
                        : "bg-transparent text-gray-800"
                        } px-2 py-1 rounded`}
                    >
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}
    </div>
    </div>
  );
}