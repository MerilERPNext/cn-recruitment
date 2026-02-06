import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { usePayCompOff } from "../../../hooks/useLeaves";
import toast from "react-hot-toast";
import { Typography } from "../../shared/atoms/Typography";
import Tooltip from "../../shared/Tooltip";
import {
  sanitizeToPlainText,
  truncateByChars,
} from "../../../utils/sanitizeToPlainText";
import StatusBadge from "../../shared/atoms/statusBadge";
export type CompensatoryRequestItem = {
  name: string;
  leave_type: string;
  custom_status: "issued" | "allocated" | "expired" | string;
  work_from_date: string;
  work_end_date: string;
  reason?: string;
  pay_button_required: boolean;
  docstatus: number;
};

type CompensatoryRequestCardProps = {
  item: CompensatoryRequestItem;
  onClick?: () => void;
};

const CompensatoryRequestCard = ({
  item,
  onClick,
}: CompensatoryRequestCardProps) => {
  const { isDesktop } = useScreenSize();
  const { mutate: payCompOff, isPending } = usePayCompOff();

  const handlePay = (e: React.MouseEvent) => {
    e.stopPropagation();
    payCompOff(item.name, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: (response: any) => {
        toast.success(
          `Payment request successful: ${response.message || item.name}`,
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        toast.error(
          `Payment request failed: ${error.message || "Unknown error"}`,
        );
      },
    });
  };

  const resolveCompOffStatus = (customStatus?: string, docstatus?: number) => {
    const status = customStatus?.toLowerCase().trim();

    if (status === "issued" && (docstatus === 0 || docstatus === 1)) {
      return "issued";
    }

    if (status === "allocated" && docstatus === 1) {
      return "allocated";
    }

    if (status === "expired") {
      return "expired";
    }

    return customStatus || "unknown";
  };

  const cleanReason = sanitizeToPlainText(item.reason);
  const truncatedReason = truncateByChars(cleanReason);

  const formattedFromDate = item?.work_from_date
    ? format(new Date(item.work_from_date), "dd/MM/yyyy")
    : "N/A";
  const formattedToDate = item?.work_end_date
    ? format(new Date(item.work_end_date), "dd/MM/yyyy")
    : "N/A";

  return isDesktop ? (
    <div
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1.5fr 1fr 1fr" }}
      className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      onClick={onClick}
    >
      <Typography variant="bodySmall" className="font-medium text-center">
        {item.leave_type}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formattedFromDate}{" "}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {formattedToDate}{" "}
      </Typography>

      <Tooltip content={cleanReason}>
        <Typography
          variant="bodySmall"
          className="font-medium text-center truncate"
        >
          {truncatedReason}
        </Typography>
      </Tooltip>

      <div className="flex items-center justify-center">
        <StatusBadge
          status={resolveCompOffStatus(item?.custom_status, item?.docstatus)}
        />
      </div>
      <div className="flex items-center justify-center">
        {item?.pay_button_required ? (
          <button
            onClick={handlePay}
            disabled={isPending}
            className="bg-primary hover:bg-primary-600 text-white px-4 rounded-lg text-sm py-1"
          >
            {isPending ? "Processing..." : "Pay"}
          </button>
        ) : (
          <div className="h-8 px-3 flex items-center justify-center rounded-3xl bg-gray-10 text-gray-600 text-xs font-medium w-fit">
            NA
          </div>
        )}
      </div>
    </div>
  ) : (
    <div
      className="w-full mt-2 flex items-center gap-3 bg-white shadow-sm rounded-xl border border-gray-200 p-3"
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
        <Calendar size={20} />
      </div>

      <div className="flex-1">
        <div className="card-title">{item?.leave_type}</div>
        <div className="card-subtitle py-1">
          {formattedFromDate} – {formattedToDate}
        </div>
        <div className="card-subtitle truncate">{item.reason || "—"}</div>
      </div>

      <div className="flex items-center">
        <StatusBadge
          status={resolveCompOffStatus(item?.custom_status, item?.docstatus)}
        />
      </div>
    </div>
  );
};

export default CompensatoryRequestCard;
