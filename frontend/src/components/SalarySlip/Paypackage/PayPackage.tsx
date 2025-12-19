/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { usePayPackage } from "../../../hooks/payroll/usePayroll";

type SalaryItem = any;

export default function SalaryAssignmentList() {
  const { data: apiResponse, isLoading, isError } = usePayPackage();
  const [selected, setSelected] = useState<SalaryItem | null>(null);

  const list = useMemo(() => {
    return Array.isArray(apiResponse) ? apiResponse : [];
  }, [apiResponse]);

  if (isLoading) return <p className="p-4">Loading...</p>;
  if (isError) return <p className="p-4 text-red-500">Error loading data</p>;
  if (!list.length)
    return <p className="p-4 text-gray-400">No records found</p>;

  return (
    <>
      {/* LIST */}
      <div className="border rounded-md bg-white">
        <div className="px-4 py-3 font-semibold border-b">Pay Package</div>

        <div className="grid font-semibold text-xs grid-cols-5 px-4 py-2  text-gray-500 bg-gray-50">
          <div>Effective Date</div>
          <div>Status</div>
          <div>Monthly CTC</div>
          <div>Total CTC</div>
          <div>Action</div>
        </div>

        {list.map((item) => {
          const monthly = Math.round(
            (item.custom_fixed_gross_annual ?? 0) / 12
          );

          return (
            <div
              key={item.name}
              className="grid grid-cols-5 px-4 py-3 border-t items-center text-sm"
            >
              <div>{item.from_date}</div>
              <div>
                {" "}
                <span
                  className={`text-xs font-medium px-2 py-[1px] rounded-xl
                  ${
                    item.idx === 1
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-400"
                    }
                    `}
                >
                  {item.idx === 1 ? "Active" : "Disabled"}
                </span>
              </div>

              <div>₹ {monthly || "—"}</div>
              <div>₹ {item.custom_fixed_gross_annual || "—"}</div>

              <button
                className="text-blue-600 hover:underline text-left"
                onClick={() => setSelected(item)}
              >
                View
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
          <div className="bg-white w-full max-w-[30%] shadow-lg relative h-screen overflow-y-auto">
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-lg">CTC Breakdown</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="p-4 space-y-6 text-sm">
              {/* SUMMARY */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded">
                <div>
                  <p className="text-gray-500">Monthly CTC</p>
                  <p className="font-semibold">
                    ₹ {Math.round(selected.custom_fixed_gross_annual / 12)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Annual CTC</p>
                  <p className="font-semibold">
                    ₹ {selected.custom_fixed_gross_annual}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Effective From</p>
                  <p className="font-semibold">{selected.from_date}</p>
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">Salary Components</p>
                <div className="space-y-2">
                  {[
                    ["Basic", selected.base],
                    ["Variable", selected.variable],
                    [
                      "Reimbursement",
                      selected.custom_total_reimbursement_amount,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="flex justify-between border-b pb-1"
                    >
                      <span>{label}</span>
                      <span>₹ {value ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EMPLOYEE INFO */}
              <div>
                <p className="font-medium mb-2">Employee Details</p>
                <div className="grid grid-cols-2 gap-y-2">
                  <span className="text-gray-500">Name</span>
                  <span>{selected.employee_name}</span>

                  <span className="text-gray-500">Designation</span>
                  <span>{selected.designation}</span>

                  <span className="text-gray-500">Company</span>
                  <span>{selected.company}</span>

                  <span className="text-gray-500">Payroll Period</span>
                  <span>{selected.custom_payroll_period || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
