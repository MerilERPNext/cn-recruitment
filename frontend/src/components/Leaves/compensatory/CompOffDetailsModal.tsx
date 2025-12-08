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
            <div className="base-title">{compOff.leave_type}</div>
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
            <div className="flex flex-col gap-1">
              <p className="card-title">From</p>
              <p className="card-subtitle">{formattedFromDate}</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="card-title">To</p>
              <p className="card-subtitle">{formattedToDate}</p>
            </div>
          </div>

          <div className="pt-2">
            <p className="card-title mb-1">Reason</p>
            <div className="bg-gray-100 rounded-md p-2 text-sm text-gray-800">
              {compOff.reason || "—"}
            </div>
          </div>

          {compOff?.pay_button_required && (
            <div className=" pt-3 flex justify-end">
              <button
                onClick={handlePay}
                disabled={isPending}
                className="bg-blue-600 rounded-md text-white px-4 py-1"
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
