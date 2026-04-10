"use client";
import { useState } from "react";
import TaxSheet from "./Component/TaxSheet";
import IncomeComputationSheet from "./Component/IncomeTax";

import TDSSlipHandler from "./Component/TDSDownloadAndView";
import Button from "../../shared/atoms/Button";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";

export default function IncomeTaxSheet() {
  const [activeTab, setActiveTab] = useState<"taxsheet" | "income-computation">(
    "taxsheet",
  );
  const { data: userUiPermission } = useGetUiPermission("Compensation");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const canPreviewTDS = isActionEnabled(
    userUiPermission,
    "preview_tds",
    "Tax Declaration Sheet"
  );
  return (
    <div className="max-w-8xl mx-auto space-y-4 sm:px-4 sm:py-4 py-2 max-h-[calc(100vh-60px)] overflow-y-auto">
      <header className="flex flex-wrap items-center justify-between gap-4  rounded">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveTab("taxsheet")}
              className={`px-4  font-medium rounded-lg border hover:bg-primary/10 hover:text-primary ${activeTab === "taxsheet" ? "bg-primary-600 text-white" : ""
                }`}
            >
              Taxsheet
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveTab("income-computation")}
              className={`px-4  font-medium rounded-lg border hover:bg-primary/10 hover:text-primary ${activeTab === "income-computation"
                ? "bg-primary-600 text-white"
                : ""
                }`}
            >
              Income Tax Computation
            </Button>
          </div>
        </div>
        {activeTab === "taxsheet" && canPreviewTDS && (
          <div className="flex items-center gap-3">
            <TDSSlipHandler disabled={false} selectedPeriod={selectedPeriod}  />
          </div>
        )}
      </header>
      {activeTab === "taxsheet" && <TaxSheet 
          selectedPeriod={selectedPeriod}   // ✅ PASS
          setSelectedPeriod={setSelectedPeriod}
          />}
      {activeTab === "income-computation" && <IncomeComputationSheet />}
    </div>
  );
}
