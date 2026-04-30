/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import {
  useTDSPRintViewPDF,
} from "../../../../hooks/useTaxSheet";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import Button from "../../../shared/atoms/Button";

type Props = {
  disabled?: boolean;
  selectedPeriod: string;
};

const TDSSlipHandler = ({ disabled, selectedPeriod }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const { mutate, isPending } = useTDSPRintViewPDF(
    selectedPeriod,
    user?.company || ""
  );

  const handleView = () => {
    if (!user?.employee || !selectedPeriod || !user?.company) return;

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
