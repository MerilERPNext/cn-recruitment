/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import Button from "../../../shared/atoms/Button";
import { useInvoiceSheetViewPDF } from "../../../../hooks/payroll/usePerquisite";

type Props = {
  invoiceID: string;
  disabled?: boolean;
  onClick: (invoiceID: string) => void;
};

const InvoicePDFview = ({ invoiceID, disabled = false, onClick }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<any>("");

  const { mutate, isPending } = useInvoiceSheetViewPDF({
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
    if (!invoiceID) {
      alert("Invoice ID missing");
      return;
    }

    onClick(invoiceID); 

    mutate(invoiceID, {
      onError: () => {
        alert("Failed to load Invoice PDF");
      },
    });
  };

  return (
    <>
<Button
  variant="soft"
  onClick={handleView}
  disabled={disabled || isPending}
  className={`px-4 py-1 text-sm border rounded-xl
    whitespace-nowrap inline-flex items-center justify-center
    ${
      disabled || isPending
        ? "bg-gray-300 text-primary cursor-not-allowed"
        : "bg-primary text-primary-500 hover:bg-blue-700"
    }
  `}
>
  {isPending ? "Loading..." : "View Invoice"}
</Button>


      <SalarySlipPDFModal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setHtml("");
        }}
        salarySlipName={invoiceID}
        htmlContent={html?.html}
      />
    </>
  );
};

export default InvoicePDFview;
