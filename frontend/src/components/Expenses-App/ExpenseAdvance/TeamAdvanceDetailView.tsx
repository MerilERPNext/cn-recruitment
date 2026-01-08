import { X } from "lucide-react";
import { useCallback, useState } from "react";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import { useApprovalListActions } from "../../../hooks/userApprovalList";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import {
  LoadingView,
  ErrorView,
} from "../../shared/DetailViewErrorLoadingWrapper";
import Badge from "../../shared/Badge";
import Button from "../../shared/atoms/Button";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatDate } from "../../../utils/qrCodeUtils";

type TeamAdvanceDetailViewProps = {
  documentName: string;
  onClose: () => void;
  onAction?: () => void;
  label?: string;
};

const formatINR = (amount: number | undefined | null) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount ?? 0
  );

const getStatus = (status: string | undefined) => {
  switch (status) {
    case "Approved":
      return { label: "Approved", statusColor: "bg-green-100 text-green-600" };
    case "Rejected":
      return { label: "Rejected", statusColor: "bg-red-100 text-red-600" };
    default:
      return { label: "Pending", statusColor: "bg-yellow-100 text-yellow-600" };
  }
};

export default function TeamAdvanceDetailView({
  documentName,
  onClose,
  onAction,
  label = "Employee Advance",
}: TeamAdvanceDetailViewProps) {
  const { isDesktop } = useScreenSize();
  const { setRefetchAttendance } = useGlobalStore();
  const { data, isLoading, error } = useGetToDoWithReferenceDoc(documentName);
  const mutation = useApprovalListActions();
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  if (isLoading) return <LoadingView onClose={onClose} label={label} />;
  if (error) return <ErrorView onClose={onClose} label={label} error={error} />;
  if (!data?.reference_document) return null;

  const ref = data.reference_document;
  const actions = (() => {
    if (!data.custom_doctype_actions) return [];
    try {
      return JSON.parse(data.custom_doctype_actions);
    } catch (e) {
      console.error("Failed to parse custom_doctype_actions:", e);
      return [];
    }
  })();
  const status = getStatus(ref.status);

  const handleAction = useCallback(
    async (action: string) => {
      setCurrentAction(action);
      try {
        await mutation.mutateAsync({
          action,
          name: data.todo_id,
        });

        setRefetchAttendance(true);
        if (onAction) onAction();
        onClose();
      } catch (e) {
        console.error(e);
      } finally {
        setCurrentAction(null);
      }
    },
    [data, mutation, onAction, onClose, setRefetchAttendance]
  );
  const DesktopBreakup = (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm">
      <table className="min-w-full text-sm text-gray-800">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-4 py-2 font-semibold">Expense Type</th>
            <th className="px-4 py-2 font-semibold">Date</th>
            <th className="px-4 py-2 font-semibold">Merchant</th>
            <th className="px-4 py-2 font-semibold">Invoice No.</th>
            <th className="px-4 py-2 font-semibold text-right">Amount</th>
            <th className="px-4 py-2 font-semibold text-center">Attachment</th>
          </tr>
        </thead>

        <tbody>
          {ref.expenses?.map((item: any, idx: number) => (
            <tr
              key={item.name || idx}
              className="border-t border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-2">{item.expense_type || "-"}</td>
              <td className="px-4 py-2">
                {formatDate(item.expense_date) || "-"}
              </td>
              <td className="px-4 py-2">{item.custom_mercent || "-"}</td>
              <td className="px-4 py-2">{item.custom_invoice_number || "-"}</td>

              <td className="px-4 py-2 text-right">
                {formatINR(item.amount ?? item.custom_amount_in_other_currency)}
              </td>

              <td className="px-4 py-2 text-center">
                {item.custom_attach_receipt ? (
                  <a
                    href={item.custom_attach_receipt}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    View Attachment
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const MobileBreakup = (
    <div className="space-y-3 mt-2">
      {ref.expenses?.map((item: any, idx: number) => (
        <div
          key={item.name || idx}
          className="border border-gray-200 rounded-lg bg-white shadow-sm p-3"
        >
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-semibold text-gray-800">
              {item.expense_type}
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {formatINR(item.amount ?? item.custom_amount_in_other_currency)}
            </p>
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <span className="font-medium">Date:</span>{" "}
              {formatDate(item.expense_date)}
            </p>
            <p>
              <span className="font-medium">Merchant:</span>{" "}
              {item.custom_mercent || "-"}
            </p>
            <p>
              <span className="font-medium">Invoice:</span>{" "}
              {item.custom_invoice_number || "-"}
            </p>
          </div>

          {item.custom_attach_receipt && (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-blue-600 underline"
              onClick={(e) => {
                e.stopPropagation();
                window.open(item.custom_attach_receipt, "_blank");
              }}
            >
              View Attachment
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const ActionButtons = actions?.length ? (
    <div className="border-t bg-white p-4 flex flex-col md:flex-row gap-3">
      {actions.map((action: string) => {
        const isLoading = currentAction === action && mutation.isPending;
        const buttonType = action.toLowerCase().trim();

        return (
          <Button
            key={action}
            disabled={isLoading}
            onClick={() => handleAction(action)}
            bgColor={
              buttonType === "approve"
                ? "green-100"
                : buttonType === "reject"
                ? "red-100"
                : "gray-200"
            }
            // textColor={
            //   buttonType === "approve"
            //     ? "green-600"
            //     : buttonType === "reject"
            //     ? "red-600"
            //     : "gray-600"
            // }
            fullWidth
            size="md"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent animate-spin rounded-full" />
            ) : (
              action
            )}
          </Button>
        );
      })}
    </div>
  ) : null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[85vh] bg-white md:rounded-lg overflow-hidden shadow-lg flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600">
              {ref.employee_name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {ref.employee_name}
              </p>
              <p className="text-xs text-gray-500">{ref.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge label={status.label} backgroundColor={status.statusColor} />
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-6">
          {/* Advance Details */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Advance Details
            </h3>
            <div className="text-sm text-gray-700 grid md:grid-cols-2 gap-y-1 gap-x-8">
              <p>
                <span className="font-medium">Advance Amount:</span>{" "}
                {formatINR(ref.advance_amount)}
              </p>
              <p>
                <span className="font-medium">Department:</span>{" "}
                {ref.department || "N/A"}
              </p>
              <p>
                <span className="font-medium">Company:</span> {ref.company}
              </p>
              <p>
                <span className="font-medium">Posting Date:</span>{" "}
                {formatDate(ref.posting_date)}
              </p>
              {ref.purpose && (
                <p className="md:col-span-2">
                  <span className="font-medium">Purpose:</span> {ref.purpose}
                </p>
              )}
            </div>
          </section>

          {/* BREAKUP */}
          {ref.expenses?.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700">
                Advance Breakup
              </h3>

              {isDesktop ? DesktopBreakup : MobileBreakup}
            </section>
          )}
        </div>

        {/* ACTION BUTTONS */}
        {ActionButtons}
      </div>
    </div>
  );
}
