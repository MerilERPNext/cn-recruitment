import React from "react";
import toast from "react-hot-toast";

export interface ExpenseAcknowledgementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAcknowledgementChecked: boolean;
  setIsAcknowledgementChecked: (checked: boolean) => void;
  pendingSubmissionType: "General" | "Relocation" | null;
  isRelocationAcknowledgementChecked: boolean;
  setIsRelocationAcknowledgementChecked: (checked: boolean) => void;
  onConfirm: (approvalStatus: string) => void;
}

export const ExpenseAcknowledgementModal: React.FC<ExpenseAcknowledgementModalProps> = ({
  isOpen,
  onClose,
  isAcknowledgementChecked,
  setIsAcknowledgementChecked,
  pendingSubmissionType,
  isRelocationAcknowledgementChecked,
  setIsRelocationAcknowledgementChecked,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!isAcknowledgementChecked) {
      toast.error("Please acknowledge the terms to proceed.");
      return;
    }
    onConfirm("Pending");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Acknowledgement</h3>
        <p className="mb-2 font-medium">I acknowledge that:</p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>I have raised the expense as per the policy-defined limits</li>
          <li>I have attached payment proof for all bills</li>
          <li>I have uploaded the approval email screenshot for exceptional expenses.</li>
        </ul>
        <div className="mb-4 flex items-start gap-2">
          <input
            type="checkbox"
            id="ack-checkbox-v2"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={isAcknowledgementChecked}
            onChange={(e) => setIsAcknowledgementChecked(e.target.checked)}
          />
          <label htmlFor="ack-checkbox-v2" className="text-sm font-semibold text-gray-800">
            I agree to the above terms.
          </label>
        </div>
        {pendingSubmissionType === "Relocation" && (
          <div className="mb-6 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
            <input
              type="checkbox"
              id="relocation-ack-checkbox"
              className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
              checked={isRelocationAcknowledgementChecked}
              onChange={(e) => setIsRelocationAcknowledgementChecked(e.target.checked)}
            />
            <label htmlFor="relocation-ack-checkbox" className="text-sm font-semibold text-blue-900">
              I acknowledge that this is my last relocation expense and all previous expenses have been submitted.
            </label>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none ${isAcknowledgementChecked
              ? "bg-blue-600 hover:bg-blue-700"
              : "cursor-not-allowed bg-blue-400"
              }`}
            onClick={handleConfirm}
            disabled={!isAcknowledgementChecked}
          >
            Confirm & Submit
          </button>
        </div>
      </div>
    </div>
  );
};
