"use client";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import {
  useIncomeTaxComputationData,
} from "../../../../hooks/useTaxSheet";

import IncomeTaxComputationlist from "./IncomeTaxComputationlist";



type taxsheetData = {
  current_tax_regime: string;
};

export default function IncomeComputationSheetContainer({ selectedPeriod }: { selectedPeriod: string }) {
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  // When an admin/HR is viewing another user, target their employee id.
  const effectiveEmployee = targetEmployeeId || user?.employee;

  const { data: taxsheetData } = useIncomeTaxComputationData(
    effectiveEmployee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data: taxsheetData | undefined };

  return (
    <div className="mb-2">
      {/* The current-tax-regime badge now renders in the page header (only on
          the Income Tax Computation tab); see TaxSheet.tsx. */}
      <div>
        <IncomeTaxComputationlist data={taxsheetData} />
      </div>
    </div>
  );
}
