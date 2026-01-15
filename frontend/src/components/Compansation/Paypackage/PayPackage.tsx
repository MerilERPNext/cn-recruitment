/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo } from "react";
import { usePayPackage } from "../../../hooks/payroll/usePayroll";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { MdErrorOutline } from "react-icons/md";

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
    "Fixed Gross Monthly",
    "Fixed Gross Annual",
    "Action",
  ];

  const columnWidths = ["1.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "0.8fr"];
  const SkeletonLoader = () => {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-50 rounded w-1/3" />
        <div className="h-10 bg-gray-50 rounded" />
        <div className="h-10 bg-gray-50 rounded" />
        <div className="h-10 bg-gray-50 rounded" />
      </div>
    );
  };
  

  if (isLoading) return <SkeletonLoader/>;


  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500">
        <MdErrorOutline size={40} className="mb-2" />
        <p className="text-lg font-semibold">Error loading data</p>
        <p className="text-sm text-red-400">
          Please try again later
        </p>
      </div>
    );
  }
  

  return (
    <div className="mt-4">
      <div className="mb-4">
        <Typography variant="h4">Pay package</Typography>
        <Typography variant="bodySmall" color="body2">
          Track and manage Pay Package
        </Typography>
      </div>

      <CardTable titles={titles} columnWidths={columnWidths}>
        <div className="  ">
          {list.map((item) =>
            isDesktop ? (
              <div
                key={item.name}
                className="my-data-row grid px-6 py-3 gap-4 items-center text-sm border hover:bg-primary/20 border-gray-100"
                style={{ gridTemplateColumns: columnWidths.join(" ") }}
              >
                <div>{item.from_date}</div>
                <div>
                  <span
                    className={`text-xs font-medium px-2 py-[1px] rounded-xl ${
                      item.active === 1
                        ? "bg-success-100 text-success border border-success-200"
                        : "bg-gray-100 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {item.active === 1 ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="font-medium">₹ {item.monthly_ctc}</div>
                <div>₹ {item.annual_ctc || "—"}</div>
                <div>₹ {item.fixed_gross_monthly || "—"}</div>
                <div>₹ {item.fixed_gross_annual || "—"}</div>
                <div>
                  <button
                    onClick={() => setSelected(item)}
                    className="text-primary  border border-primary/40 px-2 py-0.5 rounded hover:bg-primary/20 text-sm font-medium"
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
                <div className="flex items-center justify-between">
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
          {!list.length && (
            <div className="my-empty-state-card py-10 text-center text-gray-500">
              No records found.
            </div>
          )}
        </div>
      </CardTable>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
          <div
            className={`bg-white w-full ${
              isDesktop ? "max-w-[600px]" : ""
            } shadow-lg relative h-screen overflow-y-auto`}
          >
            {isDesktop ? (
              <div className="flex justify-between items-center p-4  border-b">
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
            ) : (
              <HeaderBar
                title="CTC Breakdown"
                onBack={() => setSelected(null)}
              />
            )}
            <div className="p-4 space-y-6 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Effective From</span>
                <span className="font-semibold">{selected.from_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Annual Variable Pay</span>
                <span className="font-semibold">
                  {selected.annual_variable_pay}
                </span>
              </div>

              <Card className="grid gap-3 border border-gray-200  p-4 rounded">
                <div className="flex justify-between">
                  <Typography variant="bodySmall" className="font-medium">
                    Fixed Gross Monthly CTC
                  </Typography>
                  <Typography>
                    ₹{" "}
                    {Number(selected.fixed_gross_monthly).toLocaleString(
                      "en-IN"
                    )}
                  </Typography>
                </div>
                <div className="flex justify-between">
                  <Typography variant="bodySmall" className="font-medium">
                    Monthly CTC
                  </Typography>
                  <Typography>
                    ₹ {Number(selected.monthly_ctc).toLocaleString("en-IN")}
                  </Typography>
                </div>

                <div className="flex justify-between">
                  <Typography variant="bodySmall" className="font-medium">
                    Fixed Gross Annual CTC
                  </Typography>
                  <span className="font-semibold">
                    ₹{" "}
                    {Number(selected.fixed_gross_annual).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <Typography variant="bodySmall" className="font-medium">
                    Annual CTC
                  </Typography>
                  <Typography>
                    ₹ {Number(selected.annual_ctc).toLocaleString("en-IN")}
                  </Typography>
                </div>
              </Card>

              {/* COMPONENTS */}
              <div className="space-y-6">
                <p className="font-semibold">Salary Components</p>

                <Card className="space-y-2 border border-gray-200 rounded p-4">
                  {selected.component_part_of_ctc?.map(
                    (item: CTCComponentItem, index: number) => (
                      <div
                        key={item.component ?? index}
                        className="flex justify-between items-start"
                      >
                        <Typography
                          variant="bodySmall"
                          className="font-medium flex "
                        >
                          {item.component}
                          <Typography
                            variant="bodySmall"
                            className="ml-1"
                            color="body2"
                          >
                            ({item.type})
                          </Typography>
                        </Typography>

                        <div className="text-right">
                          <Typography
                            variant="bodySmall"
                            className="font-medium "
                          >
                            Annual: ₹{" "}
                            {Number(item.amount).toLocaleString("en-IN")}
                          </Typography>
                          <Typography
                            variant="bodySmall"
                            className="ml-1"
                            color="body2"
                          >
                            Monthly: ₹{" "}
                            {(Number(item.amount) / 12).toLocaleString("en-IN")}
                          </Typography>
                        </div>
                      </div>
                    )
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
