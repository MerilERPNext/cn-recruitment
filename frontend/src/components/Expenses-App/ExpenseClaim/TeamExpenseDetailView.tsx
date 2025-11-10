import { X } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import { useState, useEffect } from "react";
import {
  useExpenseApproval,
  useExpenseSingleItemApproval,
} from "../../../hooks/useExpense";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useGetToDoWithReferenceDoc } from "../../../hooks/useAttendance";
import {
  ErrorView,
  LoadingView,
} from "../../shared/DetailViewErrorLoadingWrapper";
import Badge from "../../shared/Badge";
import Button from "../../shared/atoms/Button";
import toast from "react-hot-toast";

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
  const bulkMutation = useExpenseApproval();
  const singleMutation = useExpenseSingleItemApproval();
  const { setRefetchAttendance } = useGlobalStore();

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

  useEffect(() => {
    if (ref?.expenses && Array.isArray(ref.expenses)) {
      setExpenseItems(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref.expenses.map((item: any, index: number) => ({
          ...item,
          id: item.name || index,
          selected: false,
          sanctionedAmount: item.sanctioned_amount || item.amount || 0,
          comment: "",
        }))
      );
    }
  }, [ref?.expenses]);

  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

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

  const formatDate = (date: string): string => {
    if (!date) return "--/--/----";

    const possibleFormats = ["dd-MM-yyyy", "yyyy-MM-dd"];

    for (const dateFormat of possibleFormats) {
      const parsedDate = parse(date, dateFormat, new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, "yyyy-MM-dd");
      }
    }

    const d = new Date(date);
    if (isValid(d)) {
      return format(d, "yyyy-MM-dd");
    }

    return "--/--/----";
  };

  const formatINR = (value?: number | null) =>
    typeof value === "number" ? value.toFixed(2) : "0.00";

  const toggleSelection = (itemId: string) => {
    setExpenseItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleSelectAll = () => {
    const allSelected = expenseItems.every((item) => item.selected);
    setExpenseItems((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected }))
    );
  };

  const updateSanctionedAmount = (itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setExpenseItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, sanctionedAmount: numValue } : item
      )
    );
  };

  const updateComment = (itemId: string, value: string) => {
    setExpenseItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, comment: value } : item
      )
    );
  };

  const handleItemAction = async (
    itemId: string,
    action: "Approve" | "Reject"
  ) => {
    const item = expenseItems.find((i) => i.id === itemId);

    if (!item) return;

    if (!item.comment.trim()) {
      toast.error("Comment is required for approval/rejection");
      return;
    }

    setProcessingItemId(itemId);

    try {
      await singleMutation.mutateAsync({
        claimId,
        itemName: item.name,
        sanctionedAmount: item.sanctionedAmount,
        comments: item.comment,
        status: action,
      });

      setTimeout(() => {
        setRefetchAttendance(true);
      }, 2000);

      if (onAction) {
        onAction();
      }
    } catch (error) {
      console.error("Action failed", error);
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleBulkAction = async (action: "Approve" | "Reject") => {
    const selectedItems = expenseItems.filter((item) => item.selected);

    if (selectedItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    const missingComments = selectedItems.some((item) => !item.comment.trim());
    if (missingComments) {
      toast.error("All selected items must have comments");
      return;
    }

    setCurrentAction(action);

    try {
      const payload = {
        claim_id: claimId,
        line_items: selectedItems.map((item) => ({
          name: item.name,
          sanctioned_amount:
            action === "Approve" ? item.sanctionedAmount : undefined,
          comments: item.comment,
          status: action,
        })),
      };

      await bulkMutation.mutateAsync(payload);

      setTimeout(() => {
        setRefetchAttendance(true);
      }, 2000);

      if (onAction) {
        onAction();
      }
    } catch (error) {
      console.error("Bulk action failed", error);
    } finally {
      setCurrentAction(null);
    }
  };

  const nonReimbursableAmount = 0;
  const totalToBeReimbursed = expenseItems.reduce(
    (sum, item) => sum + item.sanctionedAmount,
    0
  );
  const totalAmount = totalToBeReimbursed;

  if (isLoading && documentName) {
    return <LoadingView onClose={onClose} label={label} />;
  }

  if (error && documentName) {
    return <ErrorView onClose={onClose} label={label} error={error} />;
  }

  if (!data?.todo_id) return null;

  const allSelected =
    expenseItems.length > 0 && expenseItems.every((item) => item.selected);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-4xl md:max-h-[90vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
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
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

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
                    (1000 * 60 * 60 * 24)
                )}{" "}
                days
              </span>
            )}
          </div>
        </div>

        {statusSource !== "Approved" && statusSource !== "Rejected" && (
          <div className="px-6 py-3 border-b bg-white flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={() => handleBulkAction("Approve")}
                disabled={bulkMutation.isPending || currentAction === "Approve"}
                size="sm"
                bgColor="green-100"
                textColor="green-600"
              >
                {currentAction === "Approve" ? "Processing..." : "Bulk Approve"}
              </Button>
              <Button
                onClick={() => handleBulkAction("Reject")}
                disabled={bulkMutation.isPending || currentAction === "Reject"}
                size="sm"
                bgColor="red-100"
                textColor="red-600"
              >
                {currentAction === "Reject" ? "Processing..." : "Bulk Reject"}
              </Button>
            </div>
          </div>
        )}

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
            expenseItems.map((item) => (
              <div
                key={item.id}
                className="mb-4 p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelection(item.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-300"
                  />

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(item.expense_date || item.creation)}
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {formatINR(item.amount)} INR
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        EXPENSE TYPE
                      </p>
                      <p className="text-sm font-medium text-gray-800">
                        {item.expense_type}
                      </p>
                    </div>

                    {item.description && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          DESCRIPTION
                        </p>
                        <p className="text-sm text-gray-700">
                          {item.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Base Amount:
                        </p>
                        <p className="text-sm font-medium">
                          {formatINR(item.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Sanctioned Amount:
                        </p>
                        <p className="text-sm font-medium">
                          {formatINR(item.sanctioned_amount)}
                        </p>
                      </div>
                    </div>

                    {item.custom_attach_receipt && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          DOCUMENTS
                        </p>
                        <a
                          href={item.custom_attach_receipt}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {item.custom_attach_receipt.split("/").pop()}
                        </a>
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="text-xs text-gray-500 uppercase mb-1 block">
                        SANCTIONED AMOUNT (INR) *
                      </label>
                      <input
                        type="number"
                        value={item.sanctionedAmount}
                        onChange={(e) =>
                          updateSanctionedAmount(item.id, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="text-xs text-gray-500 uppercase mb-1 block">
                        COMMENT *
                      </label>
                      <textarea
                        value={item.comment}
                        onChange={(e) => updateComment(item.id, e.target.value)}
                        placeholder="Add your comment here (required for approve/reject)..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                      />
                    </div>

                    {item?.custom_approval_staus === "" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleItemAction(item.id, "Approve")}
                          disabled={
                            processingItemId === item.id || !item.comment.trim()
                          }
                          size="sm"
                          bgColor="green-100"
                          textColor="green-600"
                        >
                          {processingItemId === item.id ? (
                            <span className="inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "Approve"
                          )}
                        </Button>
                        <Button
                          onClick={() => handleItemAction(item.id, "Reject")}
                          disabled={
                            processingItemId === item.id || !item.comment.trim()
                          }
                          size="sm"
                          bgColor="red-100"
                          textColor="red-600"
                        >
                          {processingItemId === item.id ? (
                            <span className="inline-block w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "Reject"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No expense items found
            </div>
          )}
        </div>

        <div className="border-t bg-white px-6 py-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Non Reimbursable Amount</span>
              <span className="font-medium">
                {formatINR(nonReimbursableAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Total Amount To Be Reimbursed
              </span>
              <span className="font-medium">
                Rs.{formatINR(totalToBeReimbursed)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold text-gray-900">Total Amount</span>
              <span className="font-bold text-gray-900">
                Rs.{formatINR(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamExpenseDetailView;
