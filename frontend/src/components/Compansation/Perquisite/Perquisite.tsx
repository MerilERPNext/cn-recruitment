/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import { formatCurrency } from "../../../utils/currency";
import StatusBadge from "../../shared/atoms/statusBadge";
import CardTable, { ColumnSortConfig } from "../../shared/CardTable";
import { Card } from "../../shared/atoms/Card";
import DataListView from "../../DataListView"; // ← adjust path as needed
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";

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
  { sortable: true, type: "string", field: "name", getValue: (item: any) => item.name ?? "" },
  { sortable: true, type: "date", field: "paymentDate", getValue: (item: any) => item.paymentDate ?? 0 },
  { sortable: true, type: "number", field: "taxableValue", getValue: (item: any) => item.taxableValue ?? 0 },
  { sortable: true, type: "string", field: "status", getValue: (item: any) => item.status ?? "" },
  { sortable: false },
];

export default function PerquisiteList() {
  const [selectedPerquisite, setSelectedPerquisite] = useState<UiPerquisite | null>(null);

  const { data: user } = useCurrentEmployeeAllDetails({
    fields: ["employee", "company"]
  });
  const { isDesktop } = useScreenSize();

  const employeeId = user?.employee ?? "";
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

  return (
    <div className="w-full lg:p-4 p-2">
      <div className="sm:mb-4 px-2 mb-2">
        <Typography variant="h4">Employee Perquisite</Typography>
        {isDesktop && (
          <Typography variant="bodySmall" color="body2">
            Track Employee Perquisite History
          </Typography>
        )}
      </div>

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
              showPagination={false}
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
                  className="max-w-screen grid px-6 py-3 gap-4 items-center border border-gray-200 bg-white hover:bg-primary/10"
                  style={{ gridTemplateColumns: columnWidths.join(" ") }}
                >
                  <Typography variant="bodySmall" className="font-medium text-center">
                    {item.name}
                  </Typography>

                  <Typography variant="bodySmall" className="font-medium text-center">
                    {item.paymentDate}
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
              isFilter={false}
              showPagination={false}
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
  );
}