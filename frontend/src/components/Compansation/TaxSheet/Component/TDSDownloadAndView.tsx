/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import {
  useTaxSheetPayrollPriodsData,
  useTDSPRintViewPDF,
} from "../../../../hooks/useTaxSheet";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../../hooks/useLoggedInUser";

type Props = {
  disabled?: boolean;
};

const TDSSlipHandler = ({ disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null
  ) as {
    data: any[] | undefined;
    refetch: () => void;
  };

  const { mutate, isPending } = useTDSPRintViewPDF(
    payrollPeriods?.[0]?.name || "",
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
        <button
          onClick={handleView}
          disabled={disabled || isPending}
          className="px-4 py-1 bg-blue-600 text-white hover:bg-blue-700 border rounded text-sm disabled:opacity-50"
        >
          {isPending ? "Loading..." : "Preview TDS"}
        </button>
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
