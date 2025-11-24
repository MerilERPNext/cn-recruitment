import React from "react";
import HeaderBar from "../../HeaderBar";
import { CompensatoryRequestItem } from "./CompensatoryRequestCard";
import { format } from "date-fns";
import { usePayCompOff } from "../../../hooks/useLeaves";
import toast from "react-hot-toast";

interface CompOffDetailsModalProps {
  compOff: CompensatoryRequestItem;
  onClose: () => void;
}

const CompOffDetailsModal: React.FC<CompOffDetailsModalProps> = ({
  compOff,
  onClose,
}) => {
  const { mutate: payCompOff, isPending } = usePayCompOff();

  const handlePay = () => {
    payCompOff(compOff.name, {
      onSuccess: (response: any) => {
        onClose();
        toast.success(
          `Payment request successful: ${response.message || compOff.name}`
        );
      },
      onError: (error: any) => {
        toast.error(
          `Payment request failed: ${error.message || "Unknown error"}`
        );
      },
    });
  };

  const formattedFromDate = compOff.work_from_date
    ? format(new Date(compOff.work_from_date), "dd MMM yyyy")
    : "N/A";

  const formattedToDate = compOff.work_end_date
    ? format(new Date(compOff.work_end_date), "dd MMM yyyy")
    : "N/A";

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <HeaderBar title="Compensatory Off Details" onBack={onClose} />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white shadow-md rounded-xl p-4 space-y-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900">
              {compOff.leave_type}
            </div>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-xl ${
                compOff.custom_status?.toLowerCase() === "issued"
                  ? "bg-yellow-100 text-yellow-800"
                  : compOff.custom_status?.toLowerCase() === "allocated"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {compOff.custom_status}
            </span>
          </div>

          <div className="flex justify-between text-sm text-gray-700 border-t pt-3">
            <div>
              <p className="text-xs text-gray-500">From</p>
              <p className="font-medium">{formattedFromDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">To</p>
              <p className="font-medium">{formattedToDate}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs text-gray-500 mb-1">Reason</p>
            <div className="bg-gray-100 rounded-md p-2 text-sm text-gray-800">
              {compOff.reason || "—"}
            </div>
          </div>

          {compOff?.pay_button_required && (
            <div className="border-t pt-3 flex justify-end">
              <button
                onClick={handlePay}
                disabled={isPending}
                className="bg-black rounded-md text-white px-4 py-1"
              >
                {isPending ? "Processing..." : "Pay"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompOffDetailsModal;
