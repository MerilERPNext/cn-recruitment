"use client";

import { useState } from "react";
import { useTDSPRintViewPDF } from "../../../../hooks/useSalaryDetails";
import SalarySlipPDFModal from "../../SalarySlipPDFModal";

type Props = {
  salarySlipName: string;
  disabled?: boolean;
};

const TDSSlipHandler = ({ salarySlipName, disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");

  const { mutate, isPending } = useTDSPRintViewPDF({
    onSuccess: (data) => {
      if (data?.response) {
        setHtml(data.response);
        setOpen(true);
      } else {
        alert("No TDS HTML found");
      }
    },
  });

  const handleView = () => {
    mutate(salarySlipName);
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleView}
          disabled={disabled || isPending}
          className="px-4 py-1 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer border rounded text-sm"
        >
           Preview TDS
        </button>
      </div>
      <SalarySlipPDFModal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setHtml("");
        }}
        salarySlipName={salarySlipName}
        salarySlipDate=""
        htmlContent={html}
      />
    </>
  );
};

export default TDSSlipHandler;
