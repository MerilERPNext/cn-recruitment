"use client"
import { useState } from "react"
import TaxSheet from "./Component/TaxSheet"
import IncomeComputationSheet from "./Component/IncomeTax"

import TDSSlipHandler from "./Component/TDSDownloadAndView"
import { useSalarySlipName } from "../../../hooks/useSalaryDetails"
import CustomDropdown from "../../shared/CustomDropdown"

type ActiveTab = "taxsheet" | "income-computation";
export default function IncomeTaxSheet() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("taxsheet")



  const { data: SalarySlipName } = useSalarySlipName() as {
    data?: { data: { name: string }[] }
  }
  const SalarySlipId = SalarySlipName?.data?.[0]?.name

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4  rounded">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <CustomDropdown
                options={[{ value: "taxsheet", label: "Taxsheet" }, { value: "income-computation", label: "Income Tax Computation" }]}
                value={activeTab}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActiveTab(e.target.value as ActiveTab)}
                position="bottom-right"
              />

              <button
                disabled
                className="px-4 py-1 rounded bg-yellow-100 text-yellow-800"
              >
                New Tax Regime
              </button>
            </div>
          </div>
          {activeTab === "taxsheet" && (<div className="flex items-center gap-3">
            {SalarySlipId && (
              <TDSSlipHandler
                salarySlipName={SalarySlipId}
                disabled={false}
              />
            )}
          </div>
          )}
        </header>
        {activeTab === "taxsheet" && (
          <TaxSheet />
        )}
        {activeTab === "income-computation" && <IncomeComputationSheet />}
      </div>
    </div>
  );
}
