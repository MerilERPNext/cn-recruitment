import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import {
  useExpenseCommentUpdate,
  useExpenseLineItemUpdate,
  useGetExpenseAttachments,
} from "../../../hooks/useExpense";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useApprovalListActions } from "../../../hooks/userApprovalList";
import { Participant, Expense } from "../../../types/expenseAdvance";

interface CustomFile {
  data?: {
    message?: {
      file_url?: string;
    };
  };
  file_url?: string;
  url?: string;
  originalName?: string;
  name?: string;
  file_name?: string;
}

interface ExtendedExpense extends Expense {
  id: string | number;
  sanctionedAmount: number;
  sanctionedAmountInput: string;
  comment: string;
}

import DOMPurify from "dompurify";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { CURRENCY_SYMBOL, formatCurrency } from "../../../utils/currency";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Button from "../../shared/atoms/Button";
import StatusBadge from "../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../shared/atoms/Typography";
import {
  ErrorView,
  LoadingView,
} from "../../shared/DetailViewErrorLoadingWrapper";
import { AttachmentCard } from "../../shared/molecules/AttachmentCard";
import WrapperHoverCard from "../../shared/WrapperHoverCard";

export function TeamExpenseDetailView({
  documentName,
  referenceName,
  data: propsData,
  onClose,
  onAction,
  label = "Expense Claim",
}: {
  documentName?: string;
  referenceName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  onClose: () => void;
  onAction?: () => void;
  label?: string;
}) {
  const updateMutation = useExpenseLineItemUpdate();
  const mutation = useApprovalListActions();
  const commentMutation = useExpenseCommentUpdate();
  const { setRefetchAttendance } = useGlobalStore();
  const { data: user } = useCurrentUser();
  const { isDesktop } = useScreenSize();

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(documentName, referenceName);


  const data = (documentName || referenceName) ? fetchedData : propsData;
  const ref = data?.reference_document || {};

  const todoId = useMemo(() => {
    return data?.todo_id || (data?.doctype === "ToDo" ? data?.name : null) || documentName || "";
  }, [data, documentName]);

  console.log(ref);

  const claimId = ref?.name || data?.reference_name || "";

  const [expenseItems, setExpenseItems] = useState<ExtendedExpense[]>([]);
  const [savingItem, setSavingItem] = useState<string | number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [isActed, setIsActed] = useState(false);
  const [showActionWarning, setShowActionWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState<string>("");
  const [showCommentModal, setShowCommentModal] = useState(false);

  const loading = useLoadingOverlay();
  const { data: claimAttachments } = useGetExpenseAttachments(claimId || undefined);

  const getCustomFileUrl = (file: CustomFile) => file.data?.message?.file_url || file.file_url || file.url || "";
  const getCustomFileName = (file: CustomFile) => file.originalName || file.name || file.file_name || undefined;

  const renderAdditionalDetails = (customFormData: string | null | undefined) => {
    if (!customFormData) return null;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = typeof customFormData === 'string' ? JSON.parse(customFormData) : customFormData as Record<string, unknown>;
    } catch {
      return null;
    }

    const keysToSkip = [
      "uid", "name", "expenseCategory", "categoryType", "expenseType",
      "custom_attach_receipt", "start_datetime", "end_datetime", "location"
    ];

    const isFileObject = (obj: unknown): obj is CustomFile => {
      if (typeof obj !== 'object' || obj === null) return false;
      const o = obj as Record<string, unknown>;
      return 'url' in o || 'originalName' in o || ('data' in o && typeof o.data === 'object');
    };

    const isFileArray = (arr: unknown): arr is CustomFile[] => 
      Array.isArray(arr) && arr.length > 0 && isFileObject(arr[0]);

    const entries = Object.entries(parsed).filter(
      ([key, value]) => !keysToSkip.includes(key) && value !== null && value !== "" && value !== undefined && !(Array.isArray(value) && value.length === 0)
    );

    if (entries.length === 0) return null;

    const formatKey = (key: string) => {
      let formatted = key.replace(/_/g, " ");
      formatted = formatted.replace(/([A-Z])/g, " $1").trim();
      return formatted.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    return (
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Typography variant="mobileCardLabel" className="block mb-3 font-semibold text-gray-700 uppercase">
          Additional Details
        </Typography>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          {entries.map(([key, value]) => {
            if (isFileArray(value)) {
              return (
                <div key={key} className="flex flex-col gap-2 col-span-2 mt-1">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{formatKey(key)}</span>
                  <div className="flex flex-col gap-2">
                    {(value as CustomFile[]).map((file, idx) => {
                      const fileUrl = getCustomFileUrl(file);
                      const fileName = getCustomFileName(file);
                      return fileUrl ? <AttachmentCard key={idx} fileUrl={fileUrl} fileName={fileName} /> : null;
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{formatKey(key)}</span>
                <span className="text-sm text-gray-800 break-words font-medium">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowUnsavedWarning(false);
  };

  const handleSaveItem = async (itemId: string | number) => {
    if (!isClaimEditable) {
      toast.error("This claim cannot be modified in its current status");
      return;
    }

    const item = expenseItems.find((i) => i.id === itemId);
    if (!item) return;

    setSavingItem(itemId);

    try {
      await loading?.wrap(
        () =>
          updateMutation.mutateAsync({
            claimId,
            itemName: item.name,
            sanctionedAmount: item.sanctionedAmount,
          }),
        "Saving sanctioned amount...",
      );

      setExpenseItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, sanctioned_amount: item.sanctionedAmount }
            : i,
        ),
      );

      setHasUnsavedChanges(false);

      setTimeout(() => {
        setRefetchAttendance(true);
      }, 2000);
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setSavingItem(null);
    }
  };

  useEffect(() => {
    if (ref?.expenses && Array.isArray(ref.expenses)) {
      setExpenseItems(
        ref.expenses.map((item: Expense, index: number): ExtendedExpense => {
          const initialAmount = item.sanctioned_amount || item.amount || 0;
          return {
            ...item,
            id: item.name || index,
            sanctionedAmount: initialAmount,
            sanctionedAmountInput: String(initialAmount),
            comment: "",
          };
        }),
      );
    }
  }, [ref?.expenses]);

  const handleAction = useCallback(
    async (action: string) => {
      if (action.toLowerCase() === "reject" && !rejectionComment.trim()) {
        setShowCommentModal(true);
        setPendingAction(action);
        return;
      }

      if (hasUnsavedChanges) {
        setPendingAction(action);
        setShowActionWarning(true);
        return;
      }

      const actionLoadingShow = ["approve", "reject"].includes(
        action.toLocaleLowerCase(),
      )
        ? action
        : `Performing Action: ${action}`;
      loading?.wrap(() => performAction(action), actionLoadingShow);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasUnsavedChanges, rejectionComment],
  );

  const performAction = async (action: string) => {
    setCurrentAction(action);

    try {
      if (mutation?.isPending) return;

      const response = await mutation?.mutateAsync({
        action,
        name: todoId,
      });

      const responseWithSession = response as unknown as { session?: unknown };

      if (
        (data?.custom_approval_type === "Approval Matrix" &&
          responseWithSession?.session) ||
        (data?.custom_approval_type === "Multi Actions" &&
          data?.custom_open_chatnext_assistant_on_action)
      ) {
        const triggerAssistant = (window as unknown as { trigger_chatnext_assistant?: (show: boolean, session: unknown) => void }).trigger_chatnext_assistant;
        if (triggerAssistant) {
          triggerAssistant(
            true,
            responseWithSession?.session,
          );
        }
      } else {
        setTimeout(() => {
          setRefetchAttendance(true);
        }, 2000);
      }

      setIsActed(true);
      document.dispatchEvent(
        new CustomEvent("approval:acted", { detail: { id: todoId } }),
      );

      if (onAction) {
        onAction();
      }

      if (action.toLowerCase() === "reject") {
        setRejectionComment("");
      }

      setCurrentAction(null);
    } catch (error) {
      setCurrentAction(null);
      toast.error(errorResponseFormater(error));

      console.error("Action failed", error);
    }
  };

  const handleConfirmAction = () => {
    setShowActionWarning(false);
    setHasUnsavedChanges(false);
    if (pendingAction) {
      performAction(pendingAction);
      setPendingAction(null);
    }
  };

  const handleCancelAction = () => {
    setShowActionWarning(false);
    setPendingAction(null);
  };

  const handleSaveComment = async () => {
    if (!rejectionComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }
    if (rejectionComment.trim().length < 15) {
      toast.error("Comment must be at least 15 characters long");
      return;
    }

    try {
      await loading?.wrap(
        () =>
          commentMutation.mutateAsync({
            referenceDoctype: ref?.doctype || "Expense Claim",
            referenceName: claimId,
            content: rejectionComment,
            comment_email: user?.name || "",
          }),
        "Saving comment...",
      );

      setShowCommentModal(false);

      if (pendingAction) {
        loading?.wrap(() => performAction(pendingAction), "Reject");
        setPendingAction(null);
        setRejectionComment("");
      }
    } catch (error) {
      console.error("Failed to save comment", error);
    }
  };

  const handleCancelComment = () => {
    setShowCommentModal(false);
    setPendingAction(null);
  };

  const getStatus = (status: string) => {
    if (status === "Pending" || status === "Open" || status === "Draft") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Cancelled" || status === "Rejected") {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-600",
      };
    }
    return {
      label: status || "Unknown",
      statusColor: "bg-gray-100 text-gray-600",
    };
  };

  const statusSource = data?.status || ref?.approval_status || "";
  const status = getStatus(statusSource);
  const isClaimEditable =
    ["Open", "Pending", "Draft"].includes(statusSource) &&
    !["Closed", "Cancelled"].includes(data?.todo_status);

  const updateSanctionedAmount = (itemId: string | number, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setExpenseItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const hasChanged = numValue !== item.sanctioned_amount;
          if (hasChanged && !hasUnsavedChanges) {
            setHasUnsavedChanges(true);
          }
          return {
            ...item,
            sanctionedAmountInput: value,
            sanctionedAmount: numValue,
          };
        }
        return item;
      }),
    );
  };

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const { totalAmount } =
    useMemo(() => {
      const approved = expenseItems.filter(
        (item) => item.custom_approval_staus === "Approved",
      );

      let totalReimbursed;

      if (approved.length > 0) {
        totalReimbursed = approved.reduce(
          (sum, item) => sum + item.sanctionedAmount,
          0,
        );
      } else {
        const itemsToCount = expenseItems.filter(
          (item) => item.custom_approval_staus !== "Rejected",
        );
        totalReimbursed = itemsToCount.reduce(
          (sum, item) => sum + item.sanctionedAmount,
          0,
        );
      }

      const total = totalReimbursed;

      return {
        totalAmount: total,
      };
    }, [expenseItems]);

  if (isLoading && documentName) {
    return <LoadingView onClose={onClose} label={label} />;
  }

  if (error && documentName) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  if (!(todoId || data?.name || data?.reference_document?.name)) return null;

  // Desktop table for participants
  const DesktopParticipants = (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm text-center">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Employee ID
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Employee Name
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Percentage
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Allocated Amount
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {ref?.custom_participants?.map((p: Participant) => {
            const name =
              p?.employee_name || p?.guest_name || p?.employee || "—";
            return (
              <tr
                key={p?.name}
                className="bg-white hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="px-4 py-3 text-gray-800">
                  {p?.employee ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-800 hover:text-primary cursor-pointer">
                  <WrapperHoverCard employeeId={p?.employee}>
                    {name}
                  </WrapperHoverCard>
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {typeof p?.percentage === "number"
                    ? `${p?.percentage}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {formatCurrency(p?.allocated_amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Mobile cards for participants
  const MobileParticipants = (
    <div className="grid grid-cols-1 gap-4">
      {ref?.custom_participants?.map((p: Participant, idx: number) => {
        const name = p?.employee_name || p?.guest_name || p?.employee || "—";
        return (
          <div
            key={p?.name}
            className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
          >
            <div className="mb-3">
              <Typography variant="label" className="card-title">
                Participant {idx + 1}
              </Typography>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Employee ID
                </Typography>
                <Typography variant="mobileCardValue">
                  {p?.employee ?? "—"}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Employee Name
                </Typography>
                <Typography variant="mobileCardValue">{name}</Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Percentage
                </Typography>
                <Typography variant="mobileCardValue">
                  {typeof p?.percentage === "number"
                    ? `${p?.percentage}%`
                    : "—"}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Allocated Amount
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatCurrency(p?.allocated_amount)}
                </Typography>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Main modal backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onMouseDown={handleClose}
      >
        {/* Modal panel */}
        <div
          className="w-full h-full md:h-auto md:max-w-xl md:max-h-[90vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <Typography
              variant="bodyMedium"
              className="font-semibold text-gray-900 leading-tight"
            >
              Expense Claim: {claimId}
            </Typography>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Sub-header */}
          <div className="px-6 py-3 bg-gray-50 border-b">
            <div className="flex items-center gap-4">
              <StatusBadge
                status={data?.status || ref?.approval_status || ""}
              />

              {data?.due_date && (
                <span className="text-sm text-gray-600">
                  Due in{" "}
                  {Math.ceil(
                    (new Date(data.due_date).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                  )}{" "}
                  days
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <Typography
                    variant="mobileCardLabel"
                    className="text-gray-500"
                  >
                    {ref?.employee_name ? "Employee Name" : "Employee ID"}
                  </Typography>
                  <Typography variant="mobileCardValue" className="truncate hover:text-primary cursor-pointer">
                    <WrapperHoverCard employeeId={ref?.employee}>
                      {ref?.employee_name || ref?.employee}
                    </WrapperHoverCard>
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <Typography variant="mobileCardLabel">Employee ID</Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {ref?.employee || "N/A"}
                  </Typography>
                </div>

              </div>
            </div>

            {expenseItems.length > 0 ? (
              expenseItems.map((item) => {
                const originalSanctionedAmount =
                  typeof item.sanctioned_amount === "number"
                    ? item.sanctioned_amount
                    : item.amount || 0;

                const isItemDirty =
                  item.sanctionedAmount !== originalSanctionedAmount;
                return (
                  <div
                    key={item.id}
                    className="mb-4 p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="flex flex-col gap-1 min-w-0">
                            <Typography variant="mobileCardLabel">
                              EXPENSE DATE
                            </Typography>
                            <Typography variant="mobileCardValue" className="truncate">
                              {formatToIndianDate(
                                item.expense_date || item.creation,
                              )}
                            </Typography>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <Typography variant="mobileCardLabel">
                              CLAIMED DATE
                            </Typography>
                            <Typography variant="mobileCardValue" className="truncate">
                              {formatToIndianDate(
                                item?.creation,
                              )}
                            </Typography>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <Typography variant="mobileCardLabel">
                              EXPENSE CATEGORY
                            </Typography>
                            <Typography variant="mobileCardValue" className="truncate">
                              {ref?.custom_expense_category_name || "--"}
                            </Typography>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <Typography variant="mobileCardLabel">
                              EXPENSE TYPE
                            </Typography>
                            <Typography variant="mobileCardValue" className="truncate">
                              {item?.custom_claim_type_name || "--"}
                            </Typography>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Typography variant="mobileCardLabel">
                              INVOICE
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {item.custom_invoice_number || "--"}
                            </Typography>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Typography variant="mobileCardLabel">
                              MERCHANT
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {item.custom_mercent || "--"}
                            </Typography>
                          </div>

                          {item.custom_from_location && (
                            <div className="flex flex-col gap-1">
                              <Typography variant="mobileCardLabel">
                                FROM LOCATION
                              </Typography>
                              <Typography variant="mobileCardValue">
                                {item.custom_from_location}
                              </Typography>
                            </div>
                          )}

                          {item.custom_to_location && (
                            <div className="flex flex-col gap-1">
                              <Typography variant="mobileCardLabel">
                                TO LOCATION
                              </Typography>
                              <Typography variant="mobileCardValue">
                                {item.custom_to_location}
                              </Typography>
                            </div>
                          )}

                          {item.custom_vehicle_type && (
                            <div className="flex flex-col gap-1">
                              <Typography variant="mobileCardLabel">
                                VEHICLE TYPE
                              </Typography>
                              <Typography variant="mobileCardValue">
                                {item.custom_vehicle_type}
                              </Typography>
                            </div>
                          )}

                          {item.custom_units && (
                            <div className="flex flex-col gap-1">
                              <Typography variant="mobileCardLabel">
                                UNITS
                              </Typography>
                              <Typography variant="mobileCardValue">
                                {item.custom_units}
                              </Typography>
                            </div>
                          )}

                          {item.custom_start_datetime && (
                            <div className="flex flex-col gap-1">
                              <Typography variant="mobileCardLabel">
                                START DATE
                              </Typography>
                              <Typography variant="mobileCardValue">
                                {formatToIndianDate(item.custom_start_datetime)}
                              </Typography>
                            </div>
                          )}

                          {item.custom_end_datetime && (
                            <div className="flex flex-col gap-1">
                              <Typography variant="mobileCardLabel">
                                END DATE
                              </Typography>
                              <Typography variant="mobileCardValue">
                                {formatToIndianDate(item.custom_end_datetime)}
                              </Typography>
                            </div>
                          )}
                        </div>

                        {item.description && (
                          <div className="mb-3">
                            <Typography
                              variant="mobileCardLabel"
                              className="mb-1"
                            >
                              DESCRIPTION
                            </Typography>
                            <div
                              className="text-sm text-gray-700 [&_p]:m-0 [&_p]:mb-1 [&_p:last-child]:mb-0"
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(item.description),
                              }}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="flex flex-col gap-1">
                            <Typography variant="mobileCardLabel">
                              Claimed Amount
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {formatCurrency(item.amount)}
                            </Typography>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Typography variant="mobileCardLabel">
                              Sanctioned Amount
                            </Typography>
                            <Typography variant="mobileCardValue">
                              {formatCurrency(item.sanctioned_amount)}
                            </Typography>
                          </div>
                        </div>

                        {/* Attachments */}
                        <div className="mb-4">
                          <Typography
                            variant="mobileCardLabel"
                            className="mb-2 uppercase"
                          >
                            Attachments
                          </Typography>
                          <div className="flex flex-col gap-2">
                            {claimAttachments?.map((file: { file_url: string }, i: number) => (
                              <AttachmentCard key={i} fileUrl={file.file_url} />
                            ))}
                            {item.custom_attach_receipt && (
                              <AttachmentCard
                                fileUrl={item.custom_attach_receipt}
                                compact={false}
                              />
                            )}
                            {(!claimAttachments || claimAttachments.length === 0) && !item.custom_attach_receipt && (
                              <span className="text-gray-400 text-xs italic">No attachments found</span>
                            )}
                          </div>
                        </div>

                        {/* Additional Details (Dynamic) */}
                        {renderAdditionalDetails(item.custom_form_data)}

                        <div className="mb-3 mt-4">
                          <label className="text-xs text-gray-500 uppercase mb-1 block font-medium">
                            SANCTIONED AMOUNT ({CURRENCY_SYMBOL}) *
                          </label>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={item.sanctionedAmountInput}
                              onChange={(e) =>
                                updateSanctionedAmount(item.id, e.target.value)
                              }
                              disabled={!isClaimEditable}
                              className="w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                              step="1"
                              min="0"
                              onKeyDown={(e) => {
                                if (e.key === "." || e.key === ",") {
                                  e.preventDefault();
                                }
                              }}
                            />
                            {isClaimEditable && isItemDirty && (
                              <Button
                                onClick={() => handleSaveItem(item.id)}
                                disabled={savingItem === item.id}
                                variant="contain"
                                bgColor="primary"
                                size="sm"
                                className="px-4 py-2 h-[38px] min-w-[70px] text-sm"
                              >
                                {savingItem === item.id ? (
                                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center border border-gray-200 rounded-lg bg-gray-50 mt-2">
                <Typography variant="mobileCardValue" className="text-gray-500">
                  No expense items found.
                </Typography>
              </div>
            )}

            {/* Participants */}
            {Array.isArray(ref?.custom_participants) &&
              ref.custom_participants.length > 0 && (
                <div className="mt-6 mb-6 px-0 md:px-0">
                  <Typography
                    variant="bodySmall"
                    className="base-title mb-2 font-bold block"
                  >
                    Participants
                  </Typography>
                  {isDesktop ? DesktopParticipants : MobileParticipants}
                </div>
              )}
          </div>

          {/* Footer totals */}
          <div className="border-t bg-white px-6 py-4">
            <div className="space-y-2 text-sm">

              <div className="flex justify-between pt-2">
                <span className="font-semibold text-lg text-gray-900">
                  Total Approved Amount
                </span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {actions?.length > 0 &&
            status?.label === "Pending" &&
            data?.todo_status !== "Closed" && !isActed ? (
            <div className="w-full bg-white border-t shadow-md p-4 z-20">
              <TeamApprovalActionPill
                variant={isDesktop ? "modal" : "buttons"}
                actions={actions}
                status={data?.status || ref?.approval_status || ""}
                recordId={todoId}
                loadingAction={
                  currentAction
                    ? { id: todoId, action: currentAction }
                    : null
                }
                onAction={(action) => handleAction(action)}
              />
            </div>
          ) : (
            <div className="w-full bg-white border-t shadow-md p-4 z-20">
              <div className="flex items-center justify-center">
                <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
                  Action Taken
                </div>
              </div>
            </div>
          )}

          {/* Comment modal */}
          {showCommentModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Comment Required
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please add a comment before rejecting this expense claim.
                </p>
                <div className="mb-4">
                  <label className="text-xs text-gray-500 uppercase mb-1 block">
                    COMMENT *
                  </label>
                  <textarea
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                    placeholder="Enter your rejection comment..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    autoFocus
                  />
                  {rejectionComment.trim().length < 15 && (
                    <p className="text-[10px] mt-1 text-right text-gray-400">
                      {rejectionComment.trim().length}/15 characters minimum
                    </p>
                  )}
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={handleCancelComment}
                    size="sm"
                    bgColor="disabled"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveComment}
                    size="sm"
                    bgColor="primary"
                    disabled={
                      rejectionComment.trim().length < 15 || commentMutation.isPending
                    }
                  >
                    {commentMutation.isPending ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Save & Continue"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Unsaved changes warning */}
          {showUnsavedWarning && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Unsaved Changes
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  You have unsaved changes to the sanctioned amount. Are you
                  sure you want to leave? Your changes will be discarded.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={handleCancelClose}
                    size="sm"
                    bgColor="disabled"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmClose}
                    size="sm"
                    bgColor="error"
                  >
                    Discard Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action warning (unsaved) */}
          {showActionWarning && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Unsaved Changes
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  You have unsaved changes to the sanctioned amount. Please save
                  your changes before performing this action, or proceed to
                  discard them.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={handleCancelAction}
                    size="sm"
                    bgColor="disabled"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmAction}
                    size="sm"
                    bgColor="error"
                  >
                    Proceed Anyway
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}