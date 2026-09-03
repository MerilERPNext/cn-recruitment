"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import {
  useEditLoanInstallment,
  useHoldLoanInstallment,
} from "../../../../hooks/useLoan";
import { Installment } from "../Type/loan";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import { useLoadingOverlay } from "../../../../context/OverlayContext";

interface LoanInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "hold" | "edit";
  installment: Installment | null;
  docId?: string;
}

export default function LoanInstallmentModal({
  isOpen,
  onClose,
  mode,
  installment,
  docId,
}: LoanInstallmentModalProps) {
  const [holdOption, setHoldOption] = useState<string>(
    "Distribute Across Future Months"
  );
  const [numberOfMonths, setNumberOfMonths] = useState<number>(1);
  const [repaymentAmount, setRepaymentAmount] = useState<string>("");

  const holdMutation = useHoldLoanInstallment();
  const editMutation = useEditLoanInstallment();
  const loading = useLoadingOverlay();

  const isSubmitting = holdMutation.isPending || editMutation.isPending;

  // Reset form state when modal opens or selected installment changes
  useEffect(() => {
    if (isOpen && installment) {
      setHoldOption("Distribute Across Future Months");
      setNumberOfMonths(1);
      setRepaymentAmount(
        installment.principal_amount ? String(installment.principal_amount) : ""
      );
    }
  }, [isOpen, installment]);

  if (!isOpen || !installment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!docId) {
      toast.error("Loan Application reference is missing.");
      return;
    }

    const paymentDate = installment.payment_date;
    if (!paymentDate) {
      toast.error("Installment payment date is missing.");
      return;
    }

    if (!numberOfMonths || numberOfMonths < 1) {
      toast.error("Number of months to hold must be at least 1.");
      return;
    }

    if (mode === "edit") {
      const parsedAmount = parseFloat(repaymentAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error("Please enter a valid repayment amount.");
        return;
      }

      try {
        await loading?.wrap(async () => {
          await editMutation.mutateAsync({
            doc_id: docId,
            payment_date: paymentDate,
            hold_option: holdOption,
            number_of_months: Number(numberOfMonths),
            repayment_amount: parsedAmount,
          });

          toast.success("Installment updated successfully.");
          onClose();
        }, "Updating installment…");
      } catch (error) {
        toast.error(
          errorResponseFormater(error, "Failed to update installment.")
        );
      }
    } else {
      try {
        await loading?.wrap(async () => {
          await holdMutation.mutateAsync({
            doc_id: docId,
            payment_date: paymentDate,
            hold_option: holdOption,
            number_of_months: Number(numberOfMonths),
          });

          toast.success("Installment held successfully.");
          onClose();
        }, "Holding installment…");
      } catch (error) {

        toast.error(
          errorResponseFormater(error, "Failed to hold installment.")
        );
      }
    }
  };

  const formattedDate = installment.payment_date
    ? formatToIndianDate(installment.payment_date)
    : "-";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching other project modals */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "edit" ? "Edit Repayment Amount" : "Hold Repayment"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {/* Payment Date (Read-only) */}
            <div>
              <Typography
                variant="bodySmall"
                className="text-gray-700 font-medium block mb-1"
              >
                Payment Date
              </Typography>
              <input
                type="text"
                value={formattedDate}
                readOnly
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed select-none font-medium outline-none"
              />
            </div>

            {/* Hold Option & Number of Months */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Typography
                  variant="bodySmall"
                  className="text-gray-700 font-medium block mb-1"
                >
                  Hold Option
                </Typography>
                <div className="relative">
                  <select
                    value={holdOption}
                    onChange={(e) => setHoldOption(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white text-gray-900 cursor-pointer"
                  >
                    <option value="Distribute Across Future Months">
                      Distribute Across Future Months
                    </option>
                    <option value="Recover Pending in Next Month">
                      Recover Pending in Next Month
                    </option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <Typography
                  variant="bodySmall"
                  className="text-gray-700 font-medium block mb-1"
                >
                  Number of Months to Hold <span className="text-red-500">*</span>
                </Typography>
                <input
                  type="number"
                  min={1}
                  value={numberOfMonths}
                  onChange={(e) =>
                    setNumberOfMonths(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-gray-900 outline-none transition"
                />
              </div>
            </div>

            {/* Repayment Amount (for Edit mode only) */}
            {mode === "edit" && (
              <div>
                <Typography
                  variant="bodySmall"
                  className="text-gray-700 font-medium block mb-1"
                >
                  Repayment Amount <span className="text-red-500">*</span>
                </Typography>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                  placeholder="Enter repayment amount"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-gray-900 placeholder:text-gray-400 outline-none transition"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
            <Button
              variant="outline"
              bgColor="text"
              size="md"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="contain"
              bgColor="primary"
              size="md"
              type="submit"
              disabled={isSubmitting}
            >
              {mode === "edit" ? "Update" : "Hold"}
            </Button>

          </div>
        </form>
      </div>
    </div>,
    document.body
  );

}
