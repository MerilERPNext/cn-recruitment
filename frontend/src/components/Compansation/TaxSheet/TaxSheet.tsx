"use client"
import { useState } from "react"
import TaxSheet from "./Component/TaxSheet"
import IncomeComputationSheet from "./Component/IncomeTax"

import TDSSlipHandler from "./Component/TDSDownloadAndView"


export default function IncomeTaxSheet() {
  const [activeTab, setActiveTab] = useState<
    "taxsheet" | "income-computation"
  >("taxsheet")


  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4  rounded">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("taxsheet")}
                className={`px-4 py-1 rounded-lg border ${
                  activeTab === "taxsheet"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700"
                }`}
              >
                Taxsheet
              </button>
              <button
                onClick={() => setActiveTab("income-computation")}
                className={`px-4 py-1 rounded-lg border ${
                  activeTab === "income-computation"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700"
                }`}
              >
                Income Tax Computation
              </button>
            </div>
          </div>
          {activeTab === "taxsheet" && (<div className="flex items-center gap-3">
        
              <TDSSlipHandler disabled={false} />
          
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
