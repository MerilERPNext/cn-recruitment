/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo } from "react";
import { usePayPackage } from "../../../hooks/payroll/usePayroll";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import CardTable from "../../shared/CardTable";

type SalaryItem = any;
type CTCComponentItem = {
  component?: string;
  type?: string;
  amount?: number;
};

export default function SalaryAssignmentList() {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";
  const { data: apiResponse, isLoading, isError } = usePayPackage(employeeId);

  const [selected, setSelected] = useState<SalaryItem | null>(null);
  const { isDesktop } = useScreenSize();

  const list = useMemo(
    () => (Array.isArray(apiResponse) ? apiResponse : []),
    [apiResponse]
  );

  const isActive = (fromDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // time ignore kare

    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    return today >= startDate;
  };

  const titles = [
    "Effective Date",
    "Status",
    "Monthly CTC",
    "Annual CTC",
    "Action",
  ];

  const columnWidths = ["1.5fr", "1fr", "1fr", "1fr", "0.8fr"];

  if (isLoading) return <p className="p-4">Loading...</p>;
  if (isError) return <p className="p-4 text-red-500">Error loading data</p>;

  return (
    <>
      <CardTable titles={titles} columnWidths={columnWidths}>
        <div className="card-subtitle bg-white ">
          {list.map((item) =>
            isDesktop ? (
              <div
                key={item.name}
                className="my-data-row grid px-6 py-3 gap-4 items-center text-sm border-t border-gray-200"
                style={{ gridTemplateColumns: columnWidths.join(" ") }}
              >
                {/* Effective Date */}
                <div>{item.from_date}</div>

                {/* Status */}
                <div>
                  <span
                    className={`text-xs font-medium px-2 py-[1px] rounded-xl
      ${
        isActive(item.from_date)
          ? "bg-green-100 text-green-600 border border-green-200"
          : "bg-gray-100 text-gray-400 border border-gray-200"
      }`}
                  >
                    {isActive(item.from_date) ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Monthly CTC */}
                <div className="font-medium">₹ {item.monthly_ctc}</div>

                {/* Annual CTC */}
                <div>₹ {item.annual_ctc || "—"}</div>

                {/* Action */}
                <div>
                  <button
                    onClick={() => setSelected(item)}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={item.name}
                className="group relative border border-slate-200 rounded-2xl bg-white p-5 transition-all duration-200 mb-4"
              >
                {/* TOP: CTC Section */}
                <div className="flex items-center  gap-6 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-500 mb-1">
                      Monthly CTC
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      ₹{Number(item.monthly_ctc).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="w-px h-10 bg-slate-400" />

                  <div className="flex-1">
                    <p className="text-[11px] text-slate-500 mb-1">
                      Annual CTC
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      ₹
                      {item.annual_ctc
                        ? Number(item.annual_ctc).toLocaleString("en-IN")
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* BOTTOM: Meta Row */}
                <div className="flex items-center justify-between">
                  {/* Left: Label + Date + Status */}
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-0.5">
                        Effective date
                      </p>
                      <p className="text-sm font-semibold text-slate-700 leading-tight">
                        {item.from_date}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl border whitespace-nowrap
          ${
            item.idx === 1
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}
                    >
                      {item.idx === 1 ? "Active" : "Disabled"}
                    </span>
                  </div>

                  {/* Right: Details */}
                  <button
                    onClick={() => setSelected(item)}
                    className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Details
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )
          )}

          {/* Empty State */}
          {!list.length && (
            <div className="my-empty-state-card py-10 text-center text-gray-500">
              No records found.
            </div>
          )}
        </div>
      </CardTable>

      {/* DETAILS DRAWER / MODAL */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
          <div
            className={`bg-white w-full ${
              isDesktop ? "max-w-[600px]" : ""
            } shadow-lg relative h-screen overflow-y-auto`}
          >
            {/* HEADER */}
            {isDesktop ? (
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="font-semibold text-lg">CTC Breakdown</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-500 hover:text-black"
                >
                  ✕
                </button>
              </div>
            ) : (
              <HeaderBar
                title="CTC Breakdown"
                onBack={() => setSelected(null)}
              />
            )}

            {/* BODY */}
            <div className="p-4 space-y-6 text-sm">
              {/* SUMMARY */}
              <div className="flex justify-between">
                <span className="text-gray-500">Effective From</span>
                <span className="font-semibold">{selected.from_date}</span>
              </div>

              <div className="grid gap-3 border border-gray-200 p-4 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly CTC</span>
                  <span className="font-semibold">
                    ₹ {selected.monthly_ctc}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Annual CTC</span>
                  <span className="font-semibold">₹ {selected.annual_ctc}</span>
                </div>
              </div>

              {/* COMPONENTS */}
              <div>
                <p className="font-medium mb-2">Salary Components</p>

                <div className="space-y-2 border border-gray-200 rounded p-4">
                  {selected.component_part_of_ctc?.map(
                    (item: CTCComponentItem, index: number) => (
                      <div
                        key={item.component ?? index}
                        className="flex justify-between items-start"
                      >
                        <span>
                          {item.component}
                          <span className="text-xs text-gray-500 ml-2">
                            ({item.type})
                          </span>
                        </span>

                        <div className="text-right">
                          <p className="font-medium">
                            ₹ {Number(item.amount).toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-gray-500">
                            Monthly: ₹{" "}
                            {(Number(item.amount) / 12).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
