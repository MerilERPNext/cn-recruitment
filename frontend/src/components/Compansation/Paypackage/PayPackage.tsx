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
          {list.map((item) => (
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
                    item.idx === 1
                      ? "bg-green-100 text-green-600 border border-green-200"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}
                >
                  {item.idx === 1 ? "Active" : "Disabled"}
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
          ))}

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
              isDesktop ? "max-w-[400px]" : ""
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
                  <span className="font-semibold">
                    ₹ {selected.annual_ctc}
                  </span>
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
                        className="flex justify-between"
                      >
                        <span>
                          {item.component}
                          <span className="text-xs text-gray-500 ml-2">
                            ({item.type})
                          </span>
                        </span>
                        <span>₹ {item.amount}</span>
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
