/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import {
  useTaxSheetPayrollPriodsData,
  useTDSPRintViewPDF,
} from "../../../../hooks/useTaxSheet";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import Button from "../../../shared/atoms/Button";

type Props = {
  disabled?: boolean;
};

const TDSSlipHandler = ({ disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");
  const { data: user } = useCurrentEmployeeAllDetails({
    fields: ["employee", "company"]
  });


  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null
  ) as {
    data: any[] | undefined;
    refetch: () => void;
  };
    const [selectedPeriod, setSelectedPeriod] = useState<string>(
      payrollPeriods?.[0]?.name || "",
    );
    useEffect(() => {
      if (!payrollPeriods?.length) return;
  
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

  const { mutate, isPending } = useTDSPRintViewPDF(
    selectedPeriod,
    user?.company || ""
  );

  const handleView = () => {
    if (!user?.employee || !payrollPeriods?.[0]?.name || !user?.company) return;

    mutate(user.employee, {
      onSuccess: (res: any) => {
        setHtml(res?.response?.html || "");
        setOpen(true);
      },
    });
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={handleView}
          disabled={disabled || isPending}
          className="px-4 py-1 bg-blue-600 text-white hover:bg-blue-700 border rounded text-sm disabled:opacity-50"
        >
          {isPending ? "Loading..." : "Preview TDS"}
        </Button>
      </div>

      <SalarySlipPDFModal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setHtml("");
        }}
        salarySlipName={user?.employee || ""}
        salarySlipDate=""
        htmlContent={html}
      />
    </>
  );
};

export default TDSSlipHandler;
