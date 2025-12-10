"use client"

import { useState } from "react"
import TaxSheet from "./Component/TaxSheet"
import IncomeComputationSheet from "./Component/IncomeTax"

export default function IncomeTaxSheet() {
  const [activeTab, setActiveTab] = useState<"taxsheet" | "income-computation">("taxsheet")

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">

       
        <div className="mb-6 flex items-center justify-between">
          
          {/* LEFT TABS */}
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
              Income Tax Computation sheet
            </button>

            <button
              disabled
              className="px-4 py-1 rounded bg-yellow-100 text-yellow-800"
            >
              New Tax Regime
            </button>
          </div>

          {/* RIGHT SIDE BUTTONS */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Currency: INR</span>

            <button className="px-4 py-1 bg-transparent border rounded text-sm">
              Preview
            </button>

            <button className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded">
              Download
            </button>
          </div>
        </div>

        {activeTab === "taxsheet" && <TaxSheet />}
        {activeTab === "income-computation" && <IncomeComputationSheet />}
      </div>
    </div>
  )
}
