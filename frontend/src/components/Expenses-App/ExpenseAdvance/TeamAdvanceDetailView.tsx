import { X } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useApprovalListActions } from "../../../hooks/userApprovalList";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { formatCurrency } from "../../../utils/currencyFormatter";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import StatusBadge from "../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import {
  ErrorView,
  LoadingView,
} from "../../shared/DetailViewErrorLoadingWrapper";
import MobileAllocatedTo from "../../shared/MobileAllocatedTo";

type TeamAdvanceDetailViewProps = {
  documentName?: string;
  referenceName?: string;
  onClose: () => void;
  onAction?: () => void;
  label?: string;
};

const formatINR = (amount: number | undefined | null) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount ?? 0,
  );

export default function TeamAdvanceDetailView({
  documentName,
  referenceName,
  onClose,
  onAction,
  label = "Employee Advance",
}: TeamAdvanceDetailViewProps) {
  const { isDesktop } = useScreenSize();
  const { setRefetchAttendance } = useGlobalStore();
  const { data, isLoading, error } = useGetToDoWithReferenceDoc(
    documentName,
    referenceName,
  );
  const mutation = useApprovalListActions();
  const [currentAction, setCurrentAction] = useState<string | null>(null);

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
        toast.error(errorResponseFormater(e));

        console.error(e);
      } finally {
        setCurrentAction(null);
      }
    },
    [data, mutation, onAction, onClose, setRefetchAttendance],
  );

  if (isLoading) return <LoadingView onClose={onClose} label={label} />;
  if (error) return <ErrorView onClose={onClose} label={label} error={error} />;
  if (!(data?.todo_id || data?.name || data?.reference_document?.name))
    return null;

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

  const DesktopBreakup = (
    <div className="mt-2 rounded-xl border border-gray-200 overflow-x-auto bg-white shadow-sm">
      <table className="min-w-full text-sm text-center">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Advance Type
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Advance Date
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Sanctioned Amount
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Claimed Amount
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Approval Status
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Description
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {ref.expenses?.map((item: any, idx: number) => (
            <tr
              key={item.name || idx}
              className="bg-white hover:bg-gray-50 transition-colors duration-150"
            >
              <td className="px-4 py-3 text-gray-800">{item.expense_type}</td>
              <td className="px-4 py-3 text-gray-800">
                {formatToIndianDate(item.expense_date)}
              </td>
              <td className="px-4 py-3 text-gray-800">
                {formatCurrency(item.sanctioned_amount)}
              </td>
              <td className="px-4 py-3 text-gray-800">
                {formatCurrency(item.amount)}
              </td>
              <td className="px-4 py-3 text-gray-800">
                {" "}
                {<StatusBadge status={item.custom_approval_staus} />}
              </td>
              <td className="px-4 py-3 text-gray-800">{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const MobileBreakup = (
    <div className="grid grid-cols-1 gap-4 mt-2">
      {ref.expenses?.map((item: any, idx: number) => (
        <div
          key={item.name || idx}
          className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
        >
          {/* Header */}
          <div className="mb-3 flex justify-between items-center">
            <Typography variant="label" className="card-title">
              Breakup Entry {idx + 1}
            </Typography>

            {/* Approval Status */}
            <StatusBadge status={item.custom_approval_staus} />
          </div>

          {/* Content */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Advance Type */}
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Advance Type</Typography>
              <Typography variant="mobileCardValue">
                {item.expense_type || "—"}
              </Typography>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Advance Date</Typography>
              <Typography variant="mobileCardValue">
                {formatToIndianDate(item.expense_date)}
              </Typography>
            </div>

            {/* Sanctioned Amount */}
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">
                Sanctioned Amount
              </Typography>
              <Typography variant="mobileCardValue">
                {formatCurrency(item.sanctioned_amount)}
              </Typography>
            </div>

            {/* Claimed Amount */}
            <div className="flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Claimed Amount</Typography>
              <Typography variant="mobileCardValue">
                {formatCurrency(item.amount)}
              </Typography>
            </div>

            {/* Description - full width */}
            <div className="col-span-2 flex flex-col gap-1">
              <Typography variant="mobileCardLabel">Description</Typography>
              <Typography variant="mobileCardValue">
                {item.description || "—"}
              </Typography>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const ActionButtons =
    actions?.length &&
    ["Open", "Pending", "Draft"].includes(ref.custom_final_status) ? (
      <div className="border-t bg-white p-4">
        <TeamApprovalActionPill
          variant={isDesktop ? "modal" : "buttons"}
          actions={actions}
          status={data?.status}
          recordId={data?.todo_id}
          loadingAction={
            currentAction ? { id: data?.todo_id, action: currentAction } : null
          }
          onAction={(action) => handleAction(action)}
        />
      </div>
    ) : (
      <div className="border-t bg-white p-4 flex justify-end">
        <StatusBadge status={"Action taken"} />
      </div>
    );

  const computedStatus =
    data.todo_status === "Closed" && ref.custom_final_status !== "Rejected"
      ? "Approved"
      : ref.custom_final_status;

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

        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography
            variant="bodyMedium"
            className="font-semibold text-gray-900 leading-tight"
          >
            Advance Details: {ref.name}
          </Typography>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-6">
          {/* Advance Details */}
          <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="text-gray-500">
                  {ref?.employee_name ? "Employee Name" : "Employee ID"}
                </Typography>
                <Typography variant="mobileCardValue">
                  {ref?.employee_name || ref?.employee}
                </Typography>
              </div>
              <div>
                <StatusBadge status={computedStatus} />
              </div>
            </div>

            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Advance Amount
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatINR(ref.advance_amount)}
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  Department
                </Typography>
                <Typography variant="mobileCardValue">
                  {ref.department || "N/A"}
                </Typography>
              </div>
            </div>

            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Company
                </Typography>
                <Typography variant="mobileCardValue">{ref.company}</Typography>
              </div>
              {computedStatus === "Approved" && (
                <div className="flex flex-col gap-2 text-right">
                  <Typography variant="mobileCardLabel" className="block">
                    Paid Status
                  </Typography>
                  <Typography variant="mobileCardValue">
                    <StatusBadge
                      status={data?.status === "Paid" ? "Paid" : "Unpaid"}
                    />
                  </Typography>
                </div>
              )}
            </div>

            <div className="flex justify-between w-full">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  Posting Date
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(ref.posting_date)}
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-right">
                <MobileAllocatedTo
                  users={data?.allocated_to}
                  roles={data?.allocated_roles}
                  username={data?.username}
                />
              </div>
            </div>
            {ref.purpose && (
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel">Purpose</Typography>
                <Typography variant="mobileCardValue">{ref.purpose}</Typography>
              </div>
            )}
          </div>

          {/* BREAKUP */}
          <section>
            <Typography
              variant="bodySmall"
              className="base-title mb-1 font-bold block"
            >
              Advance Breakup Items ({ref?.expenses?.length || 0})
            </Typography>

            {ref.expenses?.length > 0 ? (
              isDesktop ? (
                DesktopBreakup
              ) : (
                MobileBreakup
              )
            ) : (
              <div className="py-6 text-center border border-gray-200 rounded-lg bg-gray-50 mt-2">
                <Typography variant="mobileCardValue" className="text-gray-500">
                  No breakup items found for this advance.
                </Typography>
              </div>
            )}
          </section>
        </div>

        {/* ACTION BUTTONS */}
        {ActionButtons}
      </div>
    </div>
  );
}
