/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Button from "../../../shared/atoms/Button";
import { StatusBadge } from "../../../ShiftRequest/AllShiftsDashboard";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { EmployeeAdvanceUpdatePayload, useEmployeeAdvanceUpdate } from "../../../../hooks/useEmployeeAdvances";
import { Typography } from "../../../shared/atoms/Typography";

type Props = {
  open: boolean;
  item: any;
  onClose: () => void;
};

const getActionStyles = (action: string) => {
  const a = action.toLowerCase();
  if (a === "approve") return { bg: "success-50", text: "success" };
  if (a === "reject") return { bg: "error-50", text: "error" };
  return { bg: "gray-200", text: "gray-600" };
};

const AdvanceDetailsModal = ({ open, item, onClose }: Props) => {
  if (!open || !item) return null;

  const data = item.data;
  const ref = data?.reference_document;
  const loadingAction = item.loadingAction;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const advanceFormUpdate = useEmployeeAdvanceUpdate();
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();

  /* Editable fields */
  const [form, setForm] = useState({
    advance_amount: ref?.advance_amount || "",
    purpose: ref?.purpose || "",
    start_date: ref?.custom_repayment_start_date || "",
    posting_date: ref?.posting_date || "",
  });

  /* Comment modal */
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setComment("");
    setCommentOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    if (!comment.trim()) {
      toast.error("Comment is required");
      return;
    }

    const referenceDoctype = ref?.doctype || "Employee Advance";
    const referenceName = ref?.name || data?.reference_name;

    try {
      // 1️⃣ Save comment
      await commentMutation.mutateAsync({
        referenceDoctype,
        referenceName,
        content: comment,
        comment_email: user?.name || "",
      });

      // 2️⃣ Prepare payload for advance update
      const payload: EmployeeAdvanceUpdatePayload = {
        docname: referenceName,
        data: {
          advance_amount: parseFloat(form.advance_amount),
          purpose: form.purpose,
          custom_repayment_start_date: form.start_date,
          posting_date: form.posting_date,
          status: selectedAction,
        },
      };

      await advanceFormUpdate.mutateAsync(payload);

      // 3️⃣ Update parent / UI
      if (item.onAction) {
        item.onAction(selectedAction, {
          ...data,
          reference_document: {
            ...ref,
            ...form,
          },
        });
      }

      setComment("");
      setSelectedAction(null);
      setCommentOpen(false);
      onClose();
      toast.success(`${selectedAction} successful`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save comment or update advance");
    }
  };

  return (
    <>
      {/* MAIN MODAL */}
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="bg-white w-full max-w-3xl rounded-xl p-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-lg font-semibold">Advance Details</h2>
            <button onClick={onClose} className="text-xl">✕</button>
          </div>
          <div className="bg-primary/20 flex justify-between items-center px-4 py-2 rounded mt-1">
            <Typography variant="bodySmall" color="body1">
              Status
            </Typography>
            <StatusBadge status={ref?.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <ReadOnly label="Employee">{ref?.employee_name}</ReadOnly>
            <ReadOnly label="Advance Type">{ref?.custom_advance_type}</ReadOnly>

            {/* Editable fields */}
            <Input label="Advance Amount" name="advance_amount" value={form.advance_amount} onChange={handleChange} />
            <Input label="Purpose" name="purpose" value={form.purpose} onChange={handleChange} />
            <Input type="date" label="Start Date" name="start_date" value={form.start_date} onChange={handleChange} />
            <Input type="date" label="Posting Date" name="posting_date" value={form.posting_date} onChange={handleChange} />


          </div>

          {/* ACTION BUTTONS */}
          <div className="mt-6 flex gap-3 border-t pt-4">
            {actions.map((action: string) => (
              <Button
                key={action}
                onClick={() => handleActionClick(action)}
                bgColor={getActionStyles(action).bg}
                className={`text-${getActionStyles(action).text}`}
                disabled={
                  loadingAction?.id === data?.todo_id &&
                  loadingAction?.action === action
                }
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* COMMENT MODAL */}
      {commentOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-xl p-5">
            <h3 className="font-semibold mb-2">
              {selectedAction === "Reject" ? "Reject Reason" : "Approval Comment"}
            </h3>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border rounded-md p-2 text-sm"
              placeholder="Enter comment..."
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button bgColor="gray-200"  onClick={() => setCommentOpen(false)}>
                Cancel
              </Button>

              <Button
                bgColor={getActionStyles(selectedAction!).bg}
                className={`text-${getActionStyles(selectedAction!).text}`}
                onClick={handleConfirmAction}
                disabled={commentMutation.isPending}
              >
                Save & {selectedAction}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ReadOnly = ({ label, children }: any) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="font-medium">{children}</p>
  </div>
);

const Input = ({ label, ...props }: any) => (
  <div>
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <input {...props} className="w-full border rounded-md px-2 py-1 text-sm" />
  </div>
);

export default AdvanceDetailsModal;
