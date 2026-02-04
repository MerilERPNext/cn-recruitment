"use client";
import { useState } from "react";
import TaxSheet from "./Component/TaxSheet";
import IncomeComputationSheet from "./Component/IncomeTax";

import TDSSlipHandler from "./Component/TDSDownloadAndView";
import Button from "../../shared/atoms/Button";

export default function IncomeTaxSheet() {
  const [activeTab, setActiveTab] = useState<"taxsheet" | "income-computation">(
    "taxsheet",
  );

  return (
    <div className="max-w-8xl mx-auto space-y-4 px-4 py-4 max-h-[calc(100vh-60px)] overflow-y-auto">
      <header className="flex flex-wrap items-center justify-between gap-4  rounded">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveTab("taxsheet")}
              className={`px-4  font-medium rounded-lg border hover:bg-primary/10 hover:text-primary ${
                activeTab === "taxsheet" ? "bg-primary-600 text-white" : ""
              }`}
            >
              Taxsheet
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveTab("income-computation")}
              className={`px-4  font-medium rounded-lg border hover:bg-primary/10 hover:text-primary ${
                activeTab === "income-computation"
                  ? "bg-primary-600 text-white"
                  : ""
              }`}
            >
              Income Tax Computation
            </Button>
          </div>
        </div>
        {activeTab === "taxsheet" && (
          <div className="flex items-center gap-3">
            <TDSSlipHandler disabled={false} />
          </div>
        )}
      </header>
      {activeTab === "taxsheet" && <TaxSheet />}
      {activeTab === "income-computation" && <IncomeComputationSheet />}
    </div>
  );
}
