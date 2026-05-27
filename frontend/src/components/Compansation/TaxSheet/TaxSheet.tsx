"use client";
import { useState, useEffect } from "react";
import TaxSheet from "./Component/TaxSheet";
import IncomeComputationSheet from "./Component/IncomeTax";

import TDSSlipHandler from "./Component/TDSDownloadAndView";
import Button from "../../shared/atoms/Button";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CustomDropdown from "../../shared/CustomDropdown";

type PayrollPeriod = {
  start_date: string | number | Date;
  end_date: string | number | Date;
  name: string;
};

export default function IncomeTaxSheet() {
  const [activeTab, setActiveTab] = useState<"taxsheet" | "income-computation">(
    "taxsheet",
  );
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { isDesktop } = useScreenSize();
  const { data: userUiPermission } = useGetUiPermission("Compensation");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const {
    data: payrollPeriods,
  } = useTaxSheetPayrollPriodsData(user?.company ?? null) as {
    data: PayrollPeriod[] | undefined;
  };

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

  const payrollPeriodOptions =
    payrollPeriods?.map((p) => ({
      value: p.name,
      label: p.name,
    })) || [];

  const canPreviewTDS = isActionEnabled(
    userUiPermission,
    "preview_tds",
    "Tax Declaration Sheet"
  );

  return (
    <div className="flex flex-col h-full bg-app font-brand">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full">
        {/* Desktop top bar */}
        {isDesktop && (
          <div className="sm:flex items-center justify-between h-[52px] px-7">
            <div className="flex items-center gap-4">
              <span className="font-bold text-[17px] text-text-title tracking-tight">Tax Sheet</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("taxsheet")}
                  className={`px-3 py-1 font-medium rounded-lg border hover:bg-primary/10 hover:text-primary ${
                    activeTab === "taxsheet" ? "bg-primary-600 text-white" : ""
                  }`}
                >
                  Taxsheet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("income-computation")}
                  className={`px-3 py-1 font-medium rounded-lg border hover:bg-primary/10 hover:text-primary ${
                    activeTab === "income-computation" ? "bg-primary-600 text-white" : ""
                  }`}
                >
                  Income Tax Computation
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3.5">
              {activeTab === "taxsheet" && canPreviewTDS && (
                <TDSSlipHandler disabled={false} selectedPeriod={selectedPeriod} />
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-text-body2">Payroll Period</span>
                <CustomDropdown
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  options={payrollPeriodOptions}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile top bar */}
        {!isDesktop && (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[16px] text-text-title tracking-tight">Tax Sheet</span>
              <CustomDropdown
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                options={payrollPeriodOptions}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("taxsheet")}
                  className={`w-full font-medium rounded-lg border text-xs py-1.5 ${
                    activeTab === "taxsheet" ? "bg-primary-600 text-white animate-fade-in" : ""
                  }`}
                >
                  Taxsheet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("income-computation")}
                  className={`w-full font-medium rounded-lg border text-xs py-1.5 ${
                    activeTab === "income-computation" ? "bg-primary-600 text-white animate-fade-in" : ""
                  }`}
                >
                  Computation
                </Button>
              </div>
              {activeTab === "taxsheet" && canPreviewTDS && (
                <TDSSlipHandler disabled={false} selectedPeriod={selectedPeriod} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto max-h-[calc(100vh-60px)] sm:px-4 sm:py-4 py-2">
        {activeTab === "taxsheet" && (
          <TaxSheet selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />
        )}
        {activeTab === "income-computation" && (
          <IncomeComputationSheet selectedPeriod={selectedPeriod} />
        )}
      </div>
    </div>
  );
}
