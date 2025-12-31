"use client";
import { useEffect, useState } from "react";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../../hooks/useLoggedInUser";
import {
  useIncomeTaxComputationData,
  useTaxSheetPayrollPriodsData,
} from "../../../../hooks/useTaxSheet";
import CustomDropdown from "../../../shared/CustomDropdown";
import IncomeTaxComputationlist from "./IncomeTaxComputationlist";

type PayrollPeriod = {
  name: string;
};
type taxsheetData = {
  current_tax_regime: string;
  // Add other relevant fields as needed
};

export default function IncomeComputationSheetContainer() {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData() as {
    data: PayrollPeriod[] | undefined;
  };

  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  useEffect(() => {
    if (payrollPeriods?.length && !selectedPeriod) {
      const currentYear = new Date().getFullYear().toString();

      // Try to find payroll period that includes the current year
      const periodForCurrentYear =
        payrollPeriods.find((p) => p.name.includes(currentYear))?.name ||
        payrollPeriods[0].name; // fallback to first period

      setSelectedPeriod(periodForCurrentYear);
    }
  }, [payrollPeriods, selectedPeriod]);

  const { data: taxsheetData } = useIncomeTaxComputationData(
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data: taxsheetData | undefined };

  const payrollPeriodOptions =
    payrollPeriods?.map((p) => ({
      value: p.name,
      label: p.name,
    })) || [];

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };
  

  return (
    <div className="mb-2">
      <div className="py-2 px-4 bg-blue-50 rounded">
      <div className="flex items-center justify-between w-full">
<div className="flex items-center gap-4">

          <h1 className="base-title font-semibold text-gray-800">
            Income Tax Computation Sheet {selectedPeriod}
          </h1>
          <span className="text-sm bg-green-200 text-gray-600 px-2 py-1 rounded">{taxsheetData?.current_tax_regime ?? "Regime not available"}</span>
</div>
          <div className="flex flex-row md:flex-row md:items-center md:gap-4">
            <CustomDropdown
              value={selectedPeriod}
              onChange={handlePeriodChange}
              options={payrollPeriodOptions}
            />
          </div>
        </div>
      </div>
      <div>
        <IncomeTaxComputationlist data={taxsheetData} />
      </div>
    </div>
  );
}
