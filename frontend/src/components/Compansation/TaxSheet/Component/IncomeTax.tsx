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
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";

type PayrollPeriod = {
  start_date: string | number | Date;
  end_date: string | number | Date;
  name: string;
};
type taxsheetData = {
  current_tax_regime: string;
  // Add other relevant fields as needed
};

export default function IncomeComputationSheetContainer() {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(user?.company ?? null) as {
    data: PayrollPeriod[] | undefined;
  };

  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  useEffect(() => {
    if (!payrollPeriods?.length || selectedPeriod) return;
  
    const today = new Date(); 
  
    const matchedPeriod = payrollPeriods.find((p) => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
  
      // inclusive range check
      return today >= start && today <= end;
    });
  
    setSelectedPeriod(
      matchedPeriod?.name || payrollPeriods[0].name
    );
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
      <div className="py-2 rounded">
      <Card className="flex items-center justify-between w-full">
<div className="flex items-center gap-4">

          <Typography variant="subheading">
            Income Tax Computation Sheet {selectedPeriod}
          </Typography>
          <span className="text-sm bg-success/20  text-success px-2 py-1 rounded">{taxsheetData?.current_tax_regime ?? "Regime not available"}</span>
</div>
          <div className="flex flex-row md:flex-row md:items-center md:gap-4">
            <CustomDropdown
              value={selectedPeriod}
              onChange={handlePeriodChange}
              options={payrollPeriodOptions}
            />
          </div>
        </Card>
      </div>
      <div>
        <IncomeTaxComputationlist data={taxsheetData} />
      </div>
    </div>
  );
}
