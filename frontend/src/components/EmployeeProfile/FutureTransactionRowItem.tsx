import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useScreenSize } from "../../hooks/useScreenSize";
import formatToIndianDate from "../../utils/formatToIndianDate";
import FrappeAPI from "../../utils/frappeAPI";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

export interface FutureTransaction {
  name: string;
  source_doctype: string;
  effective_date: string;
  field_name: string;
  current_value: string | null;
  old_value: string | null;
  updated_value: string | null;
  created_by: string | null;
  created_on: string | null;
  source_code: string;
  source_name: string;
  source_type: string;
}

const gridTemplateColumns = "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr";

const FutureTransactionRowItem = ({ item }: { item: FutureTransaction }) => {
  const { isDesktop } = useScreenSize();
  const queryClient = useQueryClient();

  const revokeMutation = useMutation({
    mutationFn: async () => {
      return FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.employee_history.revoke_future_transaction",
        { doctype: item.source_doctype, name: item.name },
      );
    },
    onSuccess: () => {
      toast.success("Transaction revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["future-transactions"] });
    },
    onError: (error: any) => {
      console.error("Revoke error:", error);
      toast.error(errorResponseFormater(error, "Failed to revoke transaction"));
    },
  });

  const handleRevoke = () => {
    revokeMutation.mutate();
  };

  if (isDesktop) {
    return (
      <div
        className="grid items-center gap-4 px-6 h-14 border-b border-gray-50 transition-colors hover:bg-primary/5"
        style={{ gridTemplateColumns }}
      >
        {/* Type (field_name) */}
        <div className="flex items-center justify-center">
          <Typography variant="bodySmall" className="font-medium text-center">
            {item.field_name || "—"}
          </Typography>
        </div>

        {/* Change Requested From (current_value) */}
        <div className="flex items-center justify-center gap-1.5">
          <Typography variant="bodySmall" className="font-medium text-center">
            {item.current_value || "—"}
          </Typography>
        </div>

        {/* Change Requested To (updated_value) */}
        <div className="flex items-center justify-center">
          <Typography variant="bodySmall" className="font-medium text-center">
            {item.updated_value || "—"}
          </Typography>
        </div>

        {/* Effective Date (effective_date) */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.effective_date ? formatToIndianDate(item.effective_date) : "—"}
        </Typography>

        {/* Requested By (created_by) */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.created_by || "—"}
        </Typography>

        {/* Requested On (created_on) */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.created_on ? formatToIndianDate(item.created_on) : "—"}
        </Typography>

        {/* Source Name (source_type) */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.source_name || "—"}
        </Typography>

        {/* Source ID (source_code/name) */}
        <Typography variant="bodySmall" className="font-medium text-center">
          {item.source_code || "—"}
        </Typography>

        {/* Actions (Revoke button) */}
        <div className="flex items-center justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRevoke}
            disabled={revokeMutation.isPending}
            className="text-xs px-3 py-1 h-7 flex items-center justify-center gap-2"
          >
            {revokeMutation.isPending && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
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
              {item.field_name || "—"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Effective Date</Typography>
            <Typography variant="mobileCardValue">
              {item.effective_date
                ? formatToIndianDate(item.effective_date)
                : "—"}
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
              {item.source_name || "—"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Source ID</Typography>
            <Typography variant="mobileCardValue">
              {item.source_code || "—"}
            </Typography>
          </div>
        </div>

        {/* Requested By + Requested On (future fields) */}
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Requested By</Typography>
            <Typography variant="mobileCardValue">
              {item.created_by || "—"}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Requested On</Typography>
            <Typography variant="mobileCardValue">
              {item.created_on ? formatToIndianDate(item.created_on) : "—"}
            </Typography>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRevoke}
            disabled={revokeMutation.isPending}
            className="w-full text-blue-600 border-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
          >
            {revokeMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Revoke
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FutureTransactionRowItem;
