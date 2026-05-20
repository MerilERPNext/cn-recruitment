import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";

export interface FutureTransaction {
  source: string;
  ref: string;
  start_date: string;
  field: string;
  field_label: string;
  current_value: string;
  updated_value: string;
  requested_by?: string;
  requested_on?: string;
}

const gridTemplateColumns = "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr";

const FutureTransactionRowItem = ({ item }: { item: FutureTransaction }) => {
  const { isDesktop } = useScreenSize();

  const handleRevoke = () => {
    console.log("Revoke clicked for ref:", item.ref);
  };

  if (isDesktop) {
    return (
      <div
        className="grid items-center gap-4 px-6 h-14 border-b border-gray-50 transition-colors hover:bg-primary/5"
        style={{ gridTemplateColumns }}
      >
        {/* Type (field_label) */}
        <div className="flex items-center justify-center">
          <Typography
            variant="bodySmall"
            className="font-medium text-center"
          >
            {item.field_label || "—"}
          </Typography>
        </div>

        {/* Change Requested From (current_value) */}
        <div className="flex items-center justify-center gap-1.5">
          <Typography
            variant="bodySmall"
            className="font-medium text-center"
          >
            {item.current_value || "—"}
          </Typography>
        </div>

        {/* Change Requested To (updated_value) */}
        <div className="flex items-center justify-center">
          <Typography
            variant="bodySmall"
            className="font-medium text-center"
          >
            {item.updated_value || "—"}
          </Typography>
        </div>

        {/* Effective Date (start_date) */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.start_date ? formatToIndianDate(item.start_date) : "—"}
        </Typography>

        {/* Requested By (future field) */}
        <Typography
          variant="bodySmall"
          className="font-medium text-center"
        >
          {item.requested_by || "—"}
        </Typography>

        {/* Requested On (future field) */}
        <Typography
          variant="bodySmall"
          className="font-medium text-center"
        >
          {item.requested_on ? formatToIndianDate(item.requested_on) : "—"}
        </Typography>

        {/* Source Name (source) */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.source || "—"}
        </Typography>

        {/* Source ID (ref) */}
        <Typography
          variant="bodySmall"
          className="font-medium text-center"
        >
          {item.ref || "—"}
        </Typography>

        {/* Actions (Revoke button) */}
        <div className="flex items-center justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRevoke}
            className="text-xs px-3 py-1 h-7"
          >
            Revoke
          </Button>
        </div>
      </div>
    );
  }

  // Mobile Card Layout
  return (
    <div className="border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl mx-2 mb-3">
      <div className="p-4 flex flex-col gap-4 w-full">
        {/* Header Row: Type + Effective Date */}
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Type</Typography>
            <Typography variant="mobileCardValue">
              {item.field_label || "—"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Effective Date</Typography>
            <Typography variant="mobileCardValue">
              {item.start_date ? formatToIndianDate(item.start_date) : "—"}
            </Typography>
          </div>
        </div>

        {/* Change Requested From → To */}
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">From</Typography>
            <Typography variant="mobileCardValue">
              {item.current_value || "—"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">To</Typography>
            <Typography variant="mobileCardValue">
              {item.updated_value || "—"}
            </Typography>
          </div>
        </div>

        {/* Source + Source ID */}
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Source Name</Typography>
            <Typography variant="mobileCardValue">
              {item.source || "—"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Source ID</Typography>
            <Typography variant="mobileCardValue">
              {item.ref || "—"}
            </Typography>
          </div>
        </div>

        {/* Requested By + Requested On (future fields) */}
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Requested By</Typography>
            <Typography variant="mobileCardValue">
              {item.requested_by || "—"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Requested On</Typography>
            <Typography variant="mobileCardValue">
              {item.requested_on ? formatToIndianDate(item.requested_on) : "—"}
            </Typography>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRevoke}
            className="w-full text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            Revoke
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FutureTransactionRowItem;
