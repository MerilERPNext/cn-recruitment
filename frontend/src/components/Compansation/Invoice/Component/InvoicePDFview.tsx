/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";
import Button from "../../../shared/atoms/Button";
import { useInvoiceSheetViewPDF } from "../../../../hooks/payroll/usePerquisite";
import { FiEye } from "react-icons/fi";
import toast from "react-hot-toast";

type Props = {
  invoiceID: string;
  disabled?: boolean;
  onClick: (invoiceID: string) => void;
  className?: string;
};

const InvoicePDFview = ({ invoiceID, disabled = false, onClick, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  console.log(pdfUrl, "pdfUrl in InvoicePDFview");
  const { mutate, isPending } = useInvoiceSheetViewPDF({
    onSuccess: (data: any) => {
      const fileUrl = data;
      if (!fileUrl) {
        toast.error("File URL not found");
        return;
      }

      setPdfUrl(fileUrl);
      setOpen(true);
    }
  });

  const handleView = () => {
    if (!invoiceID) {
      alert("Invoice ID missing");
      return;
    }

    onClick(invoiceID);

    mutate(invoiceID, {
      onError: () => {
        toast.error("Failed to load Invoice PDF");
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
    whitespace-nowrap inline-flex items-center gap-2 justify-center
    ${className}
    ${disabled || isPending
            ? "bg-gray-300 text-primary cursor-not-allowed"
            : "bg-primary text-primary-500 hover:bg-blue-700"
          }
  `}
      >
        {isPending ? (
          "Loading..."
        ) : (
          <>
            <FiEye className="text-base" />
            View PDF
          </>
        )}
      </Button>



      <SalarySlipPDFModal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
          }
          setPdfUrl("");
        }}
        salarySlipName={invoiceID}
        pdfUrl={pdfUrl}
      />
    </>
  );
};

export default InvoicePDFview;
