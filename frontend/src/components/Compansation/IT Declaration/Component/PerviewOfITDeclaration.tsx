/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import { usePreviewOfITDeclaration } from "../../../../hooks/payroll/useITDeclaration";
import Button from "../../../shared/atoms/Button";

type Props = {
  declarationId: string;
  disabled?: boolean;
  docName?: string | undefined;
};

const PreviewOfITDeclaration = ({ declarationId, disabled = false }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string>("");

  const { mutate, isPending } = usePreviewOfITDeclaration({
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

    mutate(
      { declarationId},
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
              : "bg-primary text-primary-500 hover:bg-blue-700"
          }
        `}
      >
        {isPending ? "Loading..." : "Perview"}
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

export default PreviewOfITDeclaration;
