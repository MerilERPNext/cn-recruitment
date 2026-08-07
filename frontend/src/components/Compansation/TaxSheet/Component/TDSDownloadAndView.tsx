/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import {
  useTDSPRintViewPDF,
} from "../../../../hooks/useTaxSheet";
import { useCurrentEmployeeDetails } from "../../../../hooks/useEmployee";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import Button from "../../../shared/atoms/Button";
import { createPortal } from "react-dom";

type Props = {
  disabled?: boolean;
  selectedPeriod: string;
};

const TDSSlipHandler = ({ disabled, selectedPeriod }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  // When an admin/HR is viewing another user, target their employee id.
  const effectiveEmployee = targetEmployeeId || user?.employee;

  const { mutate, isPending } = useTDSPRintViewPDF(
    selectedPeriod,
    user?.company || ""
  );

  const handleView = () => {
    if (!effectiveEmployee || !selectedPeriod || !user?.company) return;

    mutate(effectiveEmployee, {
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
          className="px-4 py-1 bg-primary text-white hover:bg-primary-600 border rounded text-sm disabled:opacity-50"
        >
          {isPending ? "Loading..." : "Preview TDS"}
        </Button>
      </div>
      {createPortal(
        <SalarySlipPDFModal
          isOpen={open}
          onClose={() => {
            setOpen(false);
            setHtml("");
          }}
          salarySlipName={effectiveEmployee || ""}
          salarySlipDate=""
          htmlContent={html}
        />, document.body)}
    </>
  );
};

export default TDSSlipHandler;
