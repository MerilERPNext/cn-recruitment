/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import { useCompareTaxSheetViewPDF } from "../../../../hooks/payroll/useITDeclaration";

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
      <button
        type="button"
        onClick={handleView}
        disabled={disabled || isPending}
        className={`px-4 py-2 text-sm border rounded
          ${
            disabled || isPending
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }
        `}
      >
        {isPending ? "Loading..." : "Compare Tax"}
      </button>

      <SalarySlipPDFModal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setHtml("");
        }}
        salarySlipName={declarationId}
        htmlContent={html}
      />
    </>
  );
};

export default CompareTaxSheetHandler;
