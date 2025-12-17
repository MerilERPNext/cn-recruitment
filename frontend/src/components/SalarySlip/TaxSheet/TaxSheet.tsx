"use client";

import { useState } from "react";
import TaxSheet from "./Component/TaxSheet";
import IncomeComputationSheet from "./Component/IncomeTax";

export default function IncomeTaxSheet() {
  const [activeTab, setActiveTab] = useState<"taxsheet" | "income-computation">(
    "taxsheet"
  );

  return (
    <div className="min-h-screen bg-white px-3 py-2 sm:px-6 sm:py-4">
      <div className="max-w-7xl mx-auto">
        {/* HEADER CONTROLS */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* TABS */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("taxsheet")}
              className={`px-3 py-1.5 text-sm rounded-md border whitespace-nowrap ${
                activeTab === "taxsheet"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              Taxsheet
            </button>

            <button
              onClick={() => setActiveTab("income-computation")}
              className={`px-3 py-1.5 text-sm rounded-md border whitespace-nowrap ${
                activeTab === "income-computation"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700"
              }`}
            >
              Income Tax Computation
            </button>

            <button
              disabled
              className="px-3 py-1.5 text-sm rounded-md bg-yellow-100 text-yellow-800 whitespace-nowrap"
            >
              New Tax Regime
            </button>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <span className="text-xs text-gray-500">Currency: INR</span>

            <button className="px-3 py-1.5 border rounded text-sm w-full sm:w-auto">
              Preview
            </button>

            <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm w-full sm:w-auto">
              Download
            </button>
          </div>
        </div>

        {/* CONTENT */}
        {activeTab === "taxsheet" && <TaxSheet />}
        {activeTab === "income-computation" && <IncomeComputationSheet />}
      </div>
    </div>
  );
}
