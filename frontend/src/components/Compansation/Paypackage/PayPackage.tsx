/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo, useEffect } from "react";
import { usePayPackage } from "../../../hooks/payroll/usePayroll";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { MdErrorOutline } from "react-icons/md";
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import SalaryAssignmentHeader from "./PayPackageHeader";
import HeaderBar from "../../HeaderBar";
import { Banknote, CalendarDays } from "lucide-react";
import StatusBadge from "../../shared/atoms/statusBadge";

type SalaryItem = any;

type CTCComponentItem = {
  component?: string;
  type?: string;
  amount?: number;
};

type PayrollPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

export default function SalaryAssignmentList() {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const [selected, setSelected] = useState<SalaryItem | null>(null);
  const [selectedVersionItem, setSelectedVersionItem] =
    useState<SalaryItem | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [showAmount, setShowAmount] = useState(true); // 👁 toggle state

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null,
  ) as {
    data: PayrollPeriod[] | undefined;
  };

  const {
    data: apiResponse,
    isLoading,
    isError,
  } = usePayPackage(
    user?.employee || "",
    selectedPeriod || "",
    user?.company || "",
  );

  const { isDesktop } = useScreenSize();

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };

  const toggleAmount = () => {
    setShowAmount((prev) => !prev);
  };
  useEffect(() => {
    if (!payrollPeriods?.length || selectedPeriod) return;

    const today = new Date();

    const matchedPeriod = payrollPeriods.find((p) => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);

      // inclusive range check
      return today >= start && today <= end;
    });

    setSelectedPeriod(matchedPeriod?.name || payrollPeriods[0].name);
  }, [payrollPeriods, selectedPeriod]);

  const list = useMemo(
    () => (Array.isArray(apiResponse) ? apiResponse : []),
    [apiResponse],
  );

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

  const SkeletonLoader = () => (
    <div className="space-y-4 animate-pulse mt-6">
      <div className="h-10 bg-gray-50 rounded" />
      <div className="h-10 bg-gray-50 rounded" />
      <div className="h-10 bg-gray-50 rounded" />
      <div className="h-10 bg-gray-50 rounded" />
    </div>
  );

  const renderAmount = (value?: number | string) => {
    if (showAmount) {
      return <span className="blur-sm select-none">₹ XXXXX</span>;
    }
    if (value === undefined || value === null) return "—";
    return `₹ ${Number(value).toLocaleString("en-IN")}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 🔹 Header ALWAYS visible */}
      <SalaryAssignmentHeader
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
        payrollPeriods={payrollPeriods}
        isLoading={isLoading}
        showAmount={showAmount}
        onToggleAmount={toggleAmount}
      />

      {/* 🔹 Page content ONLY */}
      {isLoading && <SkeletonLoader />}

      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-red-500">
          <MdErrorOutline size={40} className="mb-2" />
          <p className="text-lg font-semibold">Error loading data</p>
          <p className="text-sm text-red-400">Please try again later</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="flex-1 overflow-y-auto md:px-4 md:pb-20">
          {isDesktop ? (
            <CardTable titles={titles} columnWidths={columnWidths}>
              {list.map((item) => (
                <div
                  key={item.name}
                  className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
                  style={{ gridTemplateColumns: columnWidths.join(" ") }}
                >
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {item.from_date}
                  </Typography>

                  <div className="flex items-center justify-center">
                    <StatusBadge
                      status={item.active === 1 ? "Active" : "Inactive"}
                    />
                  </div>

                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {renderAmount(item.fixed_gross_monthly)}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {renderAmount(item.monthly_ctc)}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {renderAmount(item.fixed_gross_annual)}
                  </Typography>

                  <Typography
                    variant="bodySmall"
                    className="font-medium text-center"
                  >
                    {renderAmount(item.annual_ctc)}
                  </Typography>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setSelected(item)}
                      className="text-primary border border-primary/40 px-2 py-0.5 rounded hover:bg-primary/20 text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setSelectedVersionItem(item)}
                      className="text-primary border border-primary-300 px-2 py-0.5 rounded hover:bg-primary/20 text-sm font-medium"
                    >
                      Versions
                    </button>
                  </div>
                </div>
              ))}

              {!list.length && (
                <div className="my-empty-state-card py-10 text-center text-gray-500">
                  No records found.
                </div>
              )}
            </CardTable>
          ) : (
            <div className="space-y-1 mt-2">
              {list.map((item) => (
                <div
                  key={item.name}
                  onClick={() => setSelected(item)}
                  className="border border-indigo-200 rounded-xl p-3 bg-white
                               flex flex-col items-start justify-between gap-3
                               active:bg-indigo-50 cursor-pointer"
                >
                  {/* LEFT */}
                  <div className="flex w-full items-start justify-between gap-3">
                    {/* Icon */}

                    {/* Text */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <span className="text-success text-lg font-semibold">
                          {" "}
                          <Banknote />
                        </span>
                      </div>

                      <p className="font-semibold text-sm text-gray-900">
                        Pay Package
                      </p>
                    </div>
                    <span className="text-gray-400 text-lg leading-none">
                      ›
                    </span>
                  </div>

                  {/* RIGHT */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col gap-1">
                      <p className="text-[11px] text-gray-400 uppercase">
                        Fixed Gross (Annual)
                      </p>

                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        {renderAmount(item.fixed_gross_annual)}
                        <span className="text-gray-400 text-xs">👁</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-[11px] text-gray-400 uppercase">
                        Effective From
                      </p>
                      <p className="text-xs font-medium text-gray-700">
                        {item.from_date}
                      </p>
                    </div>
                  </div>
                  <div></div>
                </div>
              ))}

              {!list.length && (
                <p className="text-center text-gray-500 py-10">
                  No records found
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= CTC MODAL ================= */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
          <div
            className={`bg-white w-full ${
              isDesktop ? "max-w-[600px]" : ""
            } shadow-lg relative h-screen overflow-y-auto`}
          >
            {isDesktop ? (
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
            ) : (
              <HeaderBar
                title="CTC Breakdown"
                onBack={() => setSelected(null)}
              />
            )}

            <div className="p-4 space-y-6 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">Effective From</span>
                <div className="bg-success-100 rounded px-2 py-0.5 max-w-full flex items-center gap-1">
                  {" "}
                  <CalendarDays className="w-4 h-4" />
                  <span className="font-semibold">{selected.from_date}</span>
                </div>
              </div>

              <Card className="grid gap-3 border border-gray-200 p-4 rounded">
                <div className="flex justify-between">
                  <Typography variant="bodySmall" className="font-medium">
                    Fixed Gross Monthly CTC
                  </Typography>
                  <Typography>
                    {renderAmount(selected.fixed_gross_monthly)}
                  </Typography>
                </div>

                <div className="flex justify-between">
                  <Typography variant="bodySmall" className="font-medium">
                    Monthly CTC
                  </Typography>
                  <Typography>{renderAmount(selected.monthly_ctc)}</Typography>
                </div>

                <div className="flex justify-between">
                  <Typography variant="bodySmall" className="font-medium">
                    Fixed Gross Annual CTC
                  </Typography>
                  <span className="font-semibold">
                    {renderAmount(selected.fixed_gross_annual)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <Typography variant="bodySmall" className="font-medium">
                    Annual CTC
                  </Typography>
                  <Typography>{renderAmount(selected.annual_ctc)}</Typography>
                </div>
              </Card>

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
                          className="font-medium flex"
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
                            className="font-medium"
                          >
                            Annual: {renderAmount(item.amount)}
                          </Typography>
                          <Typography
                            variant="bodySmall"
                            className="ml-1"
                            color="body2"
                          >
                            Monthly:
                            {renderAmount(
                              item.amount ? item.amount / 12 : undefined,
                            )}
                          </Typography>
                        </div>
                      </div>
                    ),
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= VERSION MODAL ================= */}
      {selectedVersionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-[900px] shadow-lg rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <Typography variant="subheading">Version History</Typography>
              <button
                onClick={() => setSelectedVersionItem(null)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {!selectedVersionItem.version?.length && (
                <p className="text-sm text-gray-500">
                  No version history found.
                </p>
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
                      <p className="font-medium">{chg.property}</p>
                      <p className="text-gray-500">
                        Old: <span className="">{chg.old_value}</span>
                      </p>
                      <p className="text-gray-500">
                        New: <span className="">{chg.new_value}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {chg.modified} by {chg.modified_by}
                      </p>
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
