/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import { useForm12B } from "../../../../hooks/payroll/useITDeclaration";
import Button from "../../../shared/atoms/Button";

type Props = {
  declarationId: string;
  disabled?: boolean;
  docName?: string | undefined;
};

const Form12B = ({ declarationId, docName, disabled = false }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string>("");

  const { mutate, isPending } = useForm12B({
    onSuccess: (data: any) => {
      const htmlResponse = data?.response?.html;

      if (!htmlResponse) {
        alert("No TDS HTML found");
        return;
      }

      setHtml(htmlResponse);
      setOpen(true);
    },
  });

  const handleView = () => {
    if (!declarationId && !docName) {
      alert("Declaration ID missing");
      return;
    }

    mutate(
      { declarationId, docName: docName || "" },
      {
        onError: () => {
          alert("Failed to load Compare Tax Sheet");
        },
      }
    );
  };

  return (
    <>
      <Button
        variant="soft"
        onClick={handleView}
        disabled={disabled || isPending}
        className={`px-4 py-1 text-sm border rounded-xl
          ${
            disabled || isPending
              ? "bg-gray-300 text-primary cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary-600"
          }
        `}
      >
        {isPending ? "Loading..." : "Form 12B"}
      </Button>

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

export default Form12B;
