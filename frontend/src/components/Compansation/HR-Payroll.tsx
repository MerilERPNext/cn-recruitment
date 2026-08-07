"use client";

import React, { useEffect, useState } from "react";
import { useTaxSheetPayrollPriodsData } from "../../hooks/useTaxSheet";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import CustomDropdown from "../shared/CustomDropdown";
import { Card } from "../shared/atoms/Card";
import Form12B from "./IT Declaration/Component/Form12B";
import { useNewRegime, useITDeclarationTabData } from "../../hooks/payroll/useITDeclaration";

type PayrollPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

const PayrollDocuments: React.FC = () => {
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const effectiveEmployee = user?.employee;

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null
  ) as {
    data: PayrollPeriod[] | undefined;
  };

  const [selectedPeriod, setSelectedPeriod] = useState("");

  // Initial payroll period
  useEffect(() => {
    if (!payrollPeriods?.length || selectedPeriod) return;
    const today = new Date();
    const matchedPeriod = payrollPeriods.find((p) => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      // inclusive range check
      return today >= start && today <= end;
    });
    setSelectedPeriod(matchedPeriod?.name || payrollPeriods[0].name);
  }, [payrollPeriods, selectedPeriod]);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };

  const newRegimeResponse = useNewRegime(
    effectiveEmployee || null,
    user?.company || null,
    selectedPeriod || null
  ).data as { declaration_id?: string; go_head_with_new_regime?: 0 | 1 } | undefined;
  const declarationId = newRegimeResponse?.declaration_id;
  const goHeadWithNewRegime = newRegimeResponse?.go_head_with_new_regime;
  const goHeadWithNewRegimeBool = goHeadWithNewRegime === 1;

  const { data: responseData } = useITDeclarationTabData(
    goHeadWithNewRegimeBool,
    effectiveEmployee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data?: { doctype?: string; proof_id?: string } };

  const declarationDoctype = responseData?.doctype;
  const proofId = responseData?.proof_id;
  const declarationIdFromITDeclaration = proofId || declarationId;

  return (
    <div className="bg-white min-h-screen font-brand flex flex-col">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full">
        <div className="flex items-center h-[52px] px-4 sm:px-7">
          <span className="font-bold text-[17px] text-text-title tracking-tight">Payroll Document</span>
        </div>
      </div>
      <div className="flex flex-col w-full h-full flex-1 p-4 sm:p-6 bg-gray-50/50">
        <Card shadow="sm" padding="lg" radius="xl" className="border border-gray-200 flex flex-col gap-4 w-fit">
          <div className="flex flex-col gap-1 border-b border-gray-100 pb-4">
            <span className="font-semibold text-[17px] text-text-title tracking-tight">Form 12B</span>
            <span className="text-[13px] text-text-body2">Select a payroll period to view or download your Form 12B details.</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-1">
            <div className="flex flex-col gap-1.5 mr-auto">
              <span className="text-[13px] font-medium text-text-body2">Payroll Period</span>
              <CustomDropdown
                value={selectedPeriod}
                onChange={handlePeriodChange}
                position="bottom-right"
                options={
                  payrollPeriods?.map((p) => ({
                    value: p.name,
                    label: p.name,
                  })) || []
                }
              />
            </div>

            <div className="flex items-center mt-2 sm:mt-0">
              {declarationIdFromITDeclaration ? (
                <Form12B
                  declarationId={declarationIdFromITDeclaration}
                  docName={declarationDoctype}
                  disabled={false}
                />
              ) : (
                <span className="text-[13px] text-gray-500 italic bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  No declaration found for this period
                </span>
              )}
            </div>
          </div>
        </Card>
      </div >
    </div >
  );
};

export default PayrollDocuments;
