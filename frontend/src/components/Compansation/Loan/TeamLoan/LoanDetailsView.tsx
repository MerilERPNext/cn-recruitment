/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Button from "../../../shared/atoms/Button";
import { StatusBadge } from "../../../ShiftRequest/AllShiftsDashboard";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import toast from "react-hot-toast";
import {
  LoanApplicationUpdatePayload,
  useLoanApplicationUpdate,
} from "../../../../hooks/useLoan";
import { Typography } from "../../../shared/atoms/Typography";

type Props = {
  open: boolean;
  item: any;
  onClose: () => void;
};

const getActionStyles = (action: string) => {
  const a = action.toLowerCase();
  if (a === "approve") return { bg: "green-100", text: "green-600" };
  if (a === "reject") return { bg: "red-100", text: "red-600" };
  return { bg: "gray-200", text: "gray-600" };
};

const LoanDetailsModal = ({ open, item, onClose }: Props) => {
  if (!open || !item) return null;

  const data = item.data;
  console.log("LoanDetailsModal data:", data);
  const ref = data?.reference_document;
  const loadingAction = item.loadingAction;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data.custom_doctype_actions)
    : [];

  const loanFormUpdate = useLoanApplicationUpdate();
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();

  const [repaymentType, setRepaymentType] = useState(
    ref?.repayment_method || ""
  );

  const [form, setForm] = useState({
    loan_amount: ref?.loan_amount || "",
    rate_of_interest: ref?.rate_of_interest || "",
    loan_tenure: ref?.repayment_periods || "",
    monthly_repayment_amount: ref?.repayment_amount || "",
    start_date: ref?.custom_repayment_start_date || "",
    custom_defered_date: ref?.custom_defered_date || "",
    repayment_method: ref?.repayment_method || "",
  });

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

    const referenceDoctype = ref?.doctype || "Loan Application";
    const referenceName = ref?.name || data?.reference_name;

    try {
      await commentMutation.mutateAsync({
        referenceDoctype,
        referenceName,
        content: comment,
        comment_email: user?.name || "",
      });
      const payload: LoanApplicationUpdatePayload = {
        docname: referenceName,
        data: {
          loan_amount: Number(form.loan_amount),
          rate_of_interest: Number(form.rate_of_interest),
          custom_repayment_start_date: form.start_date,
          custom_defered_date: form.custom_defered_date,
          repayment_method: form.repayment_method,
          status: selectedAction,

          ...(form.repayment_method === "Repay Fixed Amount per Period" && {
            repayment_amount: Number(form.monthly_repayment_amount),
          }),
          
          ...(form.repayment_method === "Repay Over Number of Periods" && {
            repayment_periods: Number(form.loan_tenure),
          }),
        },
      };

      await loanFormUpdate.mutateAsync(payload);

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
      toast.error("Failed to save comment or update loan");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="bg-white w-full max-w-3xl rounded-xl p-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-lg font-semibold">Loan Details</h2>
            <Button variant="soft" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="bg-primary/20 flex justify-between items-center px-4 py-2 rounded mt-1">
            <Typography variant="bodySmall" color="body1">
              Status
            </Typography>
            <StatusBadge status={ref?.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <ReadOnly label="Employee">{ref?.applicant_name}</ReadOnly>
            <ReadOnly label="Loan Type">{ref?.loan_product}</ReadOnly>

            <Input
              label="Loan Amount"
              name="loan_amount"
              value={form.loan_amount}
              onChange={handleChange}
            />

            <Input
              label="Rate of Interest (%)"
              name="rate_of_interest"
              value={form.rate_of_interest}
              onChange={handleChange}
            />

            <div>
              <p className="text-xs text-gray-400 mb-1">Repayment Type</p>
              <select
                value={form.repayment_method}
                name="repayment_method"
                onChange={(e) => {
                  const value = e.target.value;
                  setRepaymentType(value);
                  setForm((p) => ({ ...p, repayment_method: value }));
                }}
                className="w-full border rounded-md px-2 py-1 text-sm"
              >
             
                <option value="">Select Loan Type</option>
<option value="Repay Fixed Amount per Period">
  Repay Fixed Amount per Period
</option>
<option value="Repay Over Number of Periods">
  Repay Over Number of Periods
</option>
              </select>
            </div>

            {repaymentType === "Repay Over Number of Periods" && (
              <Input
                label="Loan Tenure"
                name="loan_tenure"
                value={form.loan_tenure}
                onChange={handleChange}
              />
            )}

            {repaymentType === "Repay Fixed Amount per Period" && (
              <Input
                label="Monthly Repayment Amount"
                name="monthly_repayment_amount"
                value={form.monthly_repayment_amount}
                onChange={handleChange}
              />
            )}

            <Input
              type="date"
              label="Start Date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
            />

            <Input
              type="date"
              label="Deferment Date"
              name="custom_defered_date"
              value={form.custom_defered_date}
              onChange={handleChange}
            />
          </div>

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
              {selectedAction === "Reject"
                ? "Reject Reason"
                : "Approval Comment"}
            </h3>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border rounded-md p-2 text-sm"
              placeholder="Enter comment..."
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={() => setCommentOpen(false)}>Cancel</Button>

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

export default LoanDetailsModal;

