import { Calendar } from "lucide-react";
import { format } from "date-fns";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { usePayCompOff } from "../../../hooks/useLeaves";
import toast from "react-hot-toast";

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
      onSuccess: (response: any) => {
        toast.success(
          `Payment request successful: ${response.message || item.name}`
        );
      },
      onError: (error: any) => {
        toast.error(
          `Payment request failed: ${error.message || "Unknown error"}`
        );
      },
    });
  };

  const getStatus = (status: string, docstatus: number) => {
    const key = status?.toLowerCase().trim();

    if (key === "issued" && (docstatus === 0 || docstatus === 1)) {
      return {
        label: "Issued",
        statusColor: "bg-yellow-100 text-yellow-800",
      };
    }

    if (key === "allocated" && docstatus === 1) {
      return {
        label: "Allocated",
        statusColor: "bg-green-100 text-green-800",
      };
    }

    const statusMap: { [key: string]: { label: string; statusColor: string } } =
      {
        issued: {
          label: "Issued",
          statusColor: "bg-blue-100 text-blue-800",
        },
        allocated: {
          label: "Allocated",
          statusColor: "bg-green-100 text-green-800",
        },
        expired: {
          label: "Expired",
          statusColor: "bg-red-100 text-red-800",
        },
      };

    return (
      statusMap[key] || {
        label: "Unknown",
        statusColor: "bg-gray-100 text-gray-800",
      }
    );
  };

  const status = getStatus(item?.custom_status, item?.docstatus);

  const formattedFromDate = item?.work_from_date
    ? format(new Date(item.work_from_date), "dd/MM/yyyy")
    : "N/A";
  const formattedToDate = item?.work_end_date
    ? format(new Date(item.work_end_date), "dd/MM/yyyy")
    : "N/A";

  return isDesktop ? (
    <div
      style={{ gridTemplateColumns: "1fr 1fr 1fr 2.5fr 1fr 1fr" }}
      className="grid items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-blue-50 transition-colors"
      onClick={onClick}
    >
      <div className="text-sm font-medium text-gray-700 truncate">
        {item.leave_type}
      </div>
      <div className="text-sm text-gray-900">{formattedFromDate}</div>
      <div className="text-sm text-gray-900">{formattedToDate}</div>
      <div className="text-sm text-gray-600 truncate pr-4">
        {item.reason || "—"}
      </div>
      <div className="flex justify-start">
        <Badge
          backgroundColor={status?.statusColor}
          label={status?.label || ""}
        />
      </div>
      <div>
        {item?.pay_button_required && (
          <button
            onClick={handlePay}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-sm py-1"
          >
            {isPending ? "Processing..." : "Pay"}
          </button>
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
        <Badge
          backgroundColor={status?.statusColor}
          label={status?.label || ""}
        />
      </div>
    </div>
  );
};

export default CompensatoryRequestCard;
