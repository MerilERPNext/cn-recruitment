/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { usePayPackage } from "../../../hooks/payroll/usePayroll";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";

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
          <div>Annual CTC</div>
          <div>Action</div>
        </div>

        {list.map((item) => {
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

              <div>₹ {item.monthly_ctc}</div>
              <div>₹ {item.annual_ctc || "—"}</div>

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
          <div className={`bg-white w-full ${isDesktop && "max-w-[400px]"} shadow-lg relative h-screen overflow-y-auto`}>
            {/* HEADER */}
            {isDesktop ?
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="font-semibold text-lg">CTC Breakdown</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-500 hover:text-black"
                >
                  ✕
                </button>
              </div>
              :
              <HeaderBar title="CTC Breakdown" onBack={() => setSelected(null)} />
            }
            {/* BODY */}
            <div className="p-4 space-y-6 text-sm">
              {/* SUMMARY */}
              <div className="flex justify-between items-center">
                <p className="text-gray-500">Effective From</p>
                <p className="font-semibold">{selected.from_date}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 border border-gray-200  p-4 rounded">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500">Monthly CTC</p>
                  <p className="font-semibold">₹ {selected.monthly_ctc}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-gray-500">Annual CTC</p>
                  <p className="font-semibold">₹ {selected.annual_ctc}</p>
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">Salary Components</p>
                <div className="space-y-2 border border-gray-200 rounded p-4">
                  {selected.component_part_of_ctc?.map(
                    (item: CTCComponentItem) => (
                      <div
                        key={item.component}
                        className="flex justify-between  pb-1"
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