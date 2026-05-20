import React from "react";
import { CompensatoryRequestItem } from "./CompensatoryRequestCard";
import { format } from "date-fns";
import { usePayCompOff } from "../../../hooks/useLeaves";
import toast from "react-hot-toast";
import { Typography } from "../../shared/atoms/Typography";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Wallet } from "lucide-react";
import Button from "../../shared/atoms/Button";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";

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
          `Payment request successful: ${response.message || compOff.name}`,
        );
      },
      onError: (error: any) => {
        toast.error(errorResponseFormater(error) as any);
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
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography variant="h4" className="font-semibold text-gray-900">
            Compensatory Off Details
          </Typography>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {/* Leave Type + Status */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Leave Type</Typography>

              <Typography variant="mobileCardValue" className="font-semibold">
                {compOff.leave_type}
              </Typography>
            </div>

            <StatusBadge status={compOff.custom_status} />
          </div>

          {/* Date Section */}
          <div className="flex justify-between w-full">
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">From</Typography>
              <Typography variant="mobileCardValue">
                {formattedFromDate}
              </Typography>
            </div>

            <div className="flex flex-col gap-1 text-right">
              <Typography variant="mobileCardLabel">To</Typography>
              <Typography variant="mobileCardValue">
                {formattedToDate}
              </Typography>
            </div>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-2">
            <Typography variant="mobileCardLabel">Reason</Typography>

            <Typography variant="mobileCardValue">
              {compOff.reason || "—"}
            </Typography>
          </div>
        </div>

        {/* Bottom Action */}
        {compOff?.pay_button_required && (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            <Button
              fullWidth
              size="md"
              variant="contain"
              onClick={handlePay}
              disabled={isPending}
              icon={<Wallet className="w-4 h-4" />}
            >
              {isPending ? "Processing..." : "Pay"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompOffDetailsModal;
