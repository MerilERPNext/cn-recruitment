"use client";
import { useEffect, useState } from "react";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
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
  const { data: user } = useCurrentEmployeeAllDetails(undefined, undefined, ["employee", "company"]);
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
        <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div className="flex flex-col w-full flex-wrap sm:flex-row sm:items-center gap-2">
            <Typography variant="subheading" className="whitespace-nowrap">
              Income Tax Computation Sheet {selectedPeriod}
            </Typography>

            <div className="flex w-full justify-between items-baseline">
              <span className="text-sm bg-success/20 text-success px-2 py-1 rounded w-fit">
                {taxsheetData?.current_tax_regime ?? "Regime not available"}
              </span>
              <CustomDropdown
                value={selectedPeriod}
                onChange={handlePeriodChange}
                options={payrollPeriodOptions}
              />

            </div>
          </div>

        </Card>
      </div>
      <div>
        <IncomeTaxComputationlist data={taxsheetData} />
      </div>
    </div>
  );
}
