import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useExpenseLineItemUpdate,
  useExpenseCommentUpdate,
} from "../../../hooks/useExpense";
import { useApprovalListActions } from "../../../hooks/userApprovalList";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";

import {
  ErrorView,
  LoadingView,
} from "../../shared/DetailViewErrorLoadingWrapper";
import Badge from "../../shared/Badge";
import Button from "../../shared/atoms/Button";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { getActionStyles } from "../../../utils/actionButtonStyles";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { RupeeSymbolPerfix } from "../../../utils/currency";

export function TeamExpenseDetailView({
  documentName,
  data: propsData,
  onClose,
  onAction,
  label = "Expense Claim",
}: {
  documentName?: string;
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

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(documentName || "");

  const data = documentName ? fetchedData : propsData;
  const ref = data?.reference_document || {};

  const claimId = ref?.name || data?.reference_name || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [expenseItems, setExpenseItems] = useState<any[]>([]);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [showActionWarning, setShowActionWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState<string>("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string>("");
  const [imageZoom, setImageZoom] = useState<number>(100);

  const loading = useLoadingOverlay();

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

  const handleSaveItem = async (itemId: string) => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref.expenses.map((item: any, index: number) => {
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
        name: data?.todo_id || "",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseWithSession = response as unknown as { session?: any };

      if (
        (data?.custom_approval_type === "Approval Matrix" &&
          responseWithSession?.session) ||
        (data?.custom_approval_type === "Multi Actions" &&
          data?.custom_open_chatnext_assistant_on_action)
      ) {
        if ((window as any).trigger_chatnext_assistant) {
          (window as any).trigger_chatnext_assistant(
            true,
            responseWithSession?.session,
          );
        }
      } else {
        setTimeout(() => {
          setRefetchAttendance(true);
        }, 2000);
      }

      if (onAction) {
        onAction();
      }

      if (action.toLowerCase() === "reject") {
        setRejectionComment("");
      }

      setCurrentAction(null);
    } catch (error) {
      setCurrentAction(null);
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

  const handleOpenDocument = (url: string) => {
    setCurrentDocumentUrl(url);
    setShowDocumentViewer(true);
    setImageZoom(100);
  };

  const handleCloseDocumentViewer = () => {
    setShowDocumentViewer(false);
    setCurrentDocumentUrl("");
    setImageZoom(100);
  };

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setImageZoom(100);
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
  const isClaimEditable = ["Open", "Pending", "Draft"].includes(statusSource);

  const updateSanctionedAmount = (itemId: string, value: string) => {
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

  const { totalToBeReimbursed, totalAmount, nonReimbursableAmount } =
    useMemo(() => {
      const approved = expenseItems.filter(
        (item) => item.custom_approval_staus === "Approved",
      );

      const nonReimbursable = 0;

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
        totalToBeReimbursed: totalReimbursed,
        totalAmount: total,
        nonReimbursableAmount: nonReimbursable,
      };
    }, [expenseItems]);

  if (isLoading && documentName) {
    return <LoadingView onClose={onClose} label={label} />;
  }

  if (error && documentName) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  if (!data?.todo_id) return null;

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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex gap-2 items-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                {ref?.employee_name?.substring(0, 2).toUpperCase() || "AD"}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {ref?.employee_name || "Employee Name"}
                </h2>
                <p className="text-sm text-gray-500">{claimId}</p>
              </div>
            </div>

            {actions?.length > 0 && status?.label === "Pending" && (
              <div className="ml-auto flex gap-2">
                {actions.map((action: string) => {
                  const isLoading =
                    currentAction === action && mutation?.isPending;
                  const actionStyle = getActionStyles(action);

                  return (
                    <Button
                      key={action}
                      disabled={isLoading}
                      onClick={() => handleAction(action)}
                      size="sm"
                      bgColor={actionStyle.bgColor}
                      variant={actionStyle.variant}
                    >
                      {isLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        action
                      )}
                    </Button>
                  );
                })}
              </div>
            )}

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
              <Badge
                label={status?.label as string}
                backgroundColor={status?.statusColor}
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
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Report Details
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Policy:</span>{" "}
                  <span className="font-medium">
                    {ref?.custom_expense_category || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {expenseItems.length > 0 ? (
              expenseItems.map((item) => {
                const itemStatus = getStatus(item.custom_approval_staus || "");

                const originalSanctionedAmount =
                  typeof item.sanctioned_amount === "number"
                    ? item.sanctioned_amount
                    : item.amount || 0;

                const isItemDirty =
                  item.sanctionedAmount !== originalSanctionedAmount;
                return (
                  <div
                    key={item.id}
                    className="mb-4 p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-500 uppercase">
                                EXPENSE DATE:
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatToIndianDate(
                                  item.expense_date || item.creation,
                                )}
                              </span>
                            </div>
                          </div>
                          {(item.custom_approval_staus === "Approved" ||
                            item.custom_approval_staus === "Rejected") && (
                            <Badge
                              label={itemStatus?.label as string}
                              backgroundColor={itemStatus?.statusColor}
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="">
                            <p className="text-xs text-gray-500 uppercase mb-1">
                              EXPENSE TYPE
                            </p>
                            <p className="text-sm font-medium text-gray-800">
                              {item.expense_type}
                            </p>
                          </div>

                          {item.custom_invoice_number && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">
                                INVOICE
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {item.custom_invoice_number}
                              </p>
                            </div>
                          )}

                          {item.custom_mercent && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">
                                MERCHANT
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {item.custom_mercent}
                              </p>
                            </div>
                          )}

                          {item.custom_from_location && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">
                                FROM LOCATION
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {item.custom_from_location}
                              </p>
                            </div>
                          )}

                          {item.custom_to_location && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">
                                TO LOCATION
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {item.custom_to_location}
                              </p>
                            </div>
                          )}

                          {item.custom_vehicle_type && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">
                                VEHICLE TYPE
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {item.custom_vehicle_type}
                              </p>
                            </div>
                          )}

                          {item.custom_units && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">
                                UNITS
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {item.custom_units}
                              </p>
                            </div>
                          )}

                          {item.custom_start_datetime && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">
                                START DATE
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {formatToIndianDate(item.custom_start_datetime)}
                              </p>
                            </div>
                          )}

                          {item.custom_end_datetime && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase mb-1">
                                END DATE
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {formatToIndianDate(item.custom_end_datetime)}
                              </p>
                            </div>
                          )}
                        </div>

                        {item.description && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 uppercase mb-1">
                              DESCRIPTION
                            </p>
                            <div
                              className="text-sm text-gray-700 [&_p]:m-0 [&_p]:mb-1 [&_p:last-child]:mb-0"
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(item.description),
                              }}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Claimed Amount:
                            </p>
                            <p className="text-sm font-medium">
                              {RupeeSymbolPerfix(item.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Sanctioned Amount:
                            </p>
                            <p className="text-sm font-medium">
                              {RupeeSymbolPerfix(item.sanctioned_amount)}
                            </p>
                          </div>
                        </div>

                        {item.custom_attach_receipt && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 uppercase mb-1">
                              DOCUMENTS
                            </p>
                            <button
                              onClick={() =>
                                handleOpenDocument(item.custom_attach_receipt)
                              }
                              className="text-sm text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
                            >
                              {item.custom_attach_receipt.split("/").pop()}
                            </button>
                          </div>
                        )}

                        <div className="mb-3">
                          <label className="text-xs text-gray-500 uppercase mb-1 block">
                            SANCTIONED AMOUNT (RupeeSymbolPerfix()) *
                          </label>

                          <input
                            type="number"
                            value={item.sanctionedAmountInput}
                            onChange={(e) =>
                              updateSanctionedAmount(item.id, e.target.value)
                            }
                            disabled={!isClaimEditable}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            step="1"
                            min="0"
                            onKeyDown={(e) => {
                              if (e.key === "." || e.key === ",") {
                                e.preventDefault();
                              }
                            }}
                          />
                        </div>

                        {isClaimEditable && isItemDirty && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSaveItem(item.id)}
                              disabled={savingItem === item.id}
                              variant="contain"
                              bgColor="primary"
                              size="sm"
                              className="px-4"
                            >
                              {savingItem === item.id ? (
                                <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                No expense items found
              </div>
            )}
          </div>

          {/* Footer totals */}
          <div className="border-t bg-white px-6 py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Non Reimbursable Amount</span>
                <span className="font-medium">
                  {RupeeSymbolPerfix(nonReimbursableAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Total Amount To Be Reimbursed
                </span>
                <span className="font-medium">
                  {RupeeSymbolPerfix(totalToBeReimbursed)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-gray-900">
                  Total Amount
                </span>
                <span className="font-bold text-gray-900">
                  {RupeeSymbolPerfix(totalAmount)}
                </span>
              </div>
            </div>
          </div>

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
                      !rejectionComment.trim() || commentMutation.isPending
                    }
                  >
                    {commentMutation.isPending ? (
                      <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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

      {/* Document Viewer Modal - Helpdesk Style */}
      {showDocumentViewer && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={handleCloseDocumentViewer}
        >
          <div
            className="relative bg-white rounded-xl w-[95vw] h-[90vh] max-w-xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Compact Header Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              {/* File name */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-900 truncate">
                  {currentDocumentUrl.split("/").pop()}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                {/* Zoom controls for images */}
                {currentDocumentUrl.match(
                  /\.(jpg|jpeg|png|gif|bmp|webp)$/i,
                ) && (
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1.5 py-0.5 mr-1">
                    <button
                      onClick={handleZoomOut}
                      disabled={imageZoom <= 50}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                    <span className="text-xs font-medium text-gray-600 min-w-[36px] text-center">
                      {imageZoom}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      disabled={imageZoom >= 200}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                    <div className="w-px h-3.5 bg-gray-300 mx-0.5" />
                    <button
                      onClick={handleResetZoom}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-gray-600" />
                    </button>
                  </div>
                )}

                <a
                  href={currentDocumentUrl}
                  download
                  className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4 text-gray-600" />
                </a>
                <a
                  href={currentDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                  title="Open in New Tab"
                >
                  <ExternalLink className="h-4 w-4 text-gray-600" />
                </a>
                <div className="w-px h-4 bg-gray-300 mx-0.5" />
                <button
                  onClick={handleCloseDocumentViewer}
                  className="p-1.5 rounded-md hover:bg-red-100 transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
                </button>
              </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-auto bg-gray-100">
              {currentDocumentUrl && (
                <>
                  {currentDocumentUrl.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={currentDocumentUrl}
                      className="w-full h-full border-0"
                      title="Document Viewer"
                    />
                  ) : currentDocumentUrl.match(
                      /\.(jpg|jpeg|png|gif|bmp|webp)$/i,
                    ) ? (
                    <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
                      <div
                        className="transition-transform duration-200 ease-out"
                        style={{ transform: `scale(${imageZoom / 100})` }}
                      >
                        <img
                          src={currentDocumentUrl}
                          alt="Document"
                          className="max-w-full object-contain rounded shadow-lg"
                          style={{ maxHeight: "80vh" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={currentDocumentUrl}
                      className="w-full h-full border-0"
                      title="Document Viewer"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
