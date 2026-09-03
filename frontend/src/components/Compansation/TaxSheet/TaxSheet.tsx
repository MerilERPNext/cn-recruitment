"use client";
import { useState, useEffect } from "react";
import TaxSheet from "./Component/TaxSheet";
import IncomeComputationSheet from "./Component/IncomeTax";

import TDSSlipHandler from "./Component/TDSDownloadAndView";
import Button from "../../shared/atoms/Button";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import {
  useTaxSheetPayrollPriodsData,
  useIncomeTaxComputationData,
} from "../../../hooks/useTaxSheet";
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

  // Current tax regime badge — shown in the header only on the Income Tax
  // Computation tab. Fetched here with the SAME args the income-computation
  // content uses, so it shares the react-query cache (no extra request).
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployee = targetEmployeeId || user?.employee;
  const { data: incomeTaxData } = useIncomeTaxComputationData(
    effectiveEmployee || null,
    user?.company || null,
    selectedPeriod || null,
  ) as { data: { current_tax_regime?: string } | undefined };
  const regimeBadge = (
    <span className="text-sm bg-success/20 text-success px-2 py-1 rounded w-fit font-semibold whitespace-nowrap">
      {incomeTaxData?.current_tax_regime ?? "Regime not available"}
    </span>
  );

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
              <span className="font-bold text-[16px] text-text-title tracking-tight">Tax Sheet</span>
              <div className="flex gap-2">
                <Button
                  variant={activeTab === "taxsheet" ? "contain" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("taxsheet")}
                  className="rounded-lg font-medium"
                >
                  Taxsheet
                </Button>
                <Button
                  variant={activeTab === "income-computation" ? "contain" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("income-computation")}
                  className="rounded-lg font-medium"
                >
                  Income Tax Computation
                </Button>
              </div>
              {activeTab === "income-computation" && regimeBadge}
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
                  variant={activeTab === "taxsheet" ? "contain" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("taxsheet")}
                  className={`w-full rounded-lg font-medium ${
                    activeTab === "taxsheet" ? "animate-fade-in" : ""
                  }`}
                >
                  Taxsheet
                </Button>
                <Button
                  variant={activeTab === "income-computation" ? "contain" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("income-computation")}
                  className={`w-full rounded-lg font-medium ${
                    activeTab === "income-computation" ? "animate-fade-in" : ""
                  }`}
                >
                  Computation
                </Button>
              </div>
              {activeTab === "taxsheet" && canPreviewTDS && (
                <TDSSlipHandler disabled={false} selectedPeriod={selectedPeriod} />
              )}
            </div>
            {activeTab === "income-computation" && (
              <div className="flex">{regimeBadge}</div>
            )}
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
