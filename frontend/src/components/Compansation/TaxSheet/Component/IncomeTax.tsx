"use client";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import {
  useIncomeTaxComputationData,
} from "../../../../hooks/useTaxSheet";

import IncomeTaxComputationlist from "./IncomeTaxComputationlist";



type taxsheetData = {
  current_tax_regime: string;
};

export default function IncomeComputationSheetContainer({ selectedPeriod }: { selectedPeriod: string }) {
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const { data: taxsheetData } = useIncomeTaxComputationData(
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data: taxsheetData | undefined };

  return (
    <div className="mb-2">
      <div className="py-2 rounded">
        <div className="flex items-center justify-between w-full mb-3">
          <span className="text-sm bg-success/20 text-success px-2 py-1 rounded w-fit font-semibold">
            {taxsheetData?.current_tax_regime ?? "Regime not available"}
          </span>
        </div>
      </div>
      <div>
        <IncomeTaxComputationlist data={taxsheetData} />
      </div>
    </div>
  );
}
