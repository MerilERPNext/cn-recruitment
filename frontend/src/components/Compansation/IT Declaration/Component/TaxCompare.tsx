/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import { useCompareTaxSheetViewPDF } from "../../../../hooks/payroll/useITDeclaration";
import Button from "../../../shared/atoms/Button";

type Props = {
  declarationId: string;
  disabled?: boolean;
};

const CompareTaxSheetHandler = ({ declarationId, disabled = false }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string>("");

  const { mutate, isPending } = useCompareTaxSheetViewPDF({
    onSuccess: (data: any) => {
      const htmlResponse = data?.response;

      if (!htmlResponse) {
        alert("No TDS HTML found");
        return;
      }

      setHtml(htmlResponse);
      setOpen(true);
    },
  });

  const handleView = () => {
    if (!declarationId) {
      alert("Declaration ID missing");
      return;
    }

    mutate(declarationId, {
      onError: () => {
        alert("Failed to load Compare Tax Sheet");
      },
    });
  };

  return (
    <>
      <Button
        variant="contain"
        onClick={handleView}
        disabled={disabled}
        loading={isPending}
        className="px-4 py-1 text-sm rounded-xl"
      >
        Compare Tax
      </Button>

      {open && typeof document !== "undefined" && createPortal(
        <SalarySlipPDFModal
          isOpen={open}
          onClose={() => {
            setOpen(false);
            setHtml("");
          }}
          salarySlipName={declarationId}
          htmlContent={html}
        />,
        document.body
      )}
    </>
  );
};

export default CompareTaxSheetHandler;
