/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import {
  LoanApplicationUpdatePayload,
  useLoanApplicationUpdate,
} from "../../../../hooks/useLoan";
import { getActionStyles } from "../../../../utils/actionButtonStyles";
import Button from "../../../shared/atoms/Button";
import StatusBadge from "../../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import { useScreenSize } from "../../../../hooks/useScreenSize";

type Props = {
  open: boolean;
  item: any;
  onClose: () => void;
};

const LoanDetailsModal = ({ open, item, onClose }: Props) => {
  if (!open || !item) return null;

  const {isDesktop} = useScreenSize()
  const data = item.data;
  const ref = data?.reference_document;
  const loadingAction = item.loadingAction;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data.custom_doctype_actions)
    : [];

  const loanFormUpdate = useLoanApplicationUpdate();
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();

  const [repaymentType, setRepaymentType] = useState(
    ref?.repayment_method || "",
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
      {/* MAIN MODAL */}
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <Typography
              variant="h4"
              className="font-semibold text-gray-900 leading-tight"
            >
              Loan Details
            </Typography>

            <Button
              variant="subtle"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Status bar */}
            <div className="bg-primary/20 flex justify-between items-center px-4 py-2 rounded">
              <Typography variant="bodySmall" color="body1">
                Status
              </Typography>
              <StatusBadge status={ref?.status} />
            </div>

            {/* Read-only fields — paired rows */}
            <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
              <div className="flex justify-between w-full">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Employee
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {ref?.applicant_name || ref?.applicant}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel" className="block">
                    Loan Type
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {ref?.loan_product}
                  </Typography>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Loan Amount
                </Typography>
                <input
                  name="loan_amount"
                  value={form.loan_amount}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Rate of Interest (%)
                </Typography>
                <input
                  name="rate_of_interest"
                  value={form.rate_of_interest}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Repayment Type
                </Typography>
                <select
                  value={form.repayment_method}
                  name="repayment_method"
                  onChange={(e) => {
                    const value = e.target.value;
                    setRepaymentType(value);
                    setForm((p) => ({ ...p, repayment_method: value }));
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
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
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Loan Tenure
                  </Typography>
                  <input
                    name="loan_tenure"
                    value={form.loan_tenure}
                    onChange={handleChange}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              )}

              {repaymentType === "Repay Fixed Amount per Period" && (
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Monthly Repayment Amount
                  </Typography>
                  <input
                    name="monthly_repayment_amount"
                    value={form.monthly_repayment_amount}
                    onChange={handleChange}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Start Date
                </Typography>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Deferment Date
                </Typography>
                <input
                  type="date"
                  name="custom_defered_date"
                  value={form.custom_defered_date}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS — sticky at bottom */}
          <div className="border-t bg-white p-4">
            <TeamApprovalActionPill
              variant={isDesktop ? "modal" : "buttons"}
              actions={actions}
              status={ref?.status || data?.status || ""}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => handleActionClick(action)}
            />
          </div>
        </div>
      </div>

      {/* COMMENT MODAL */}
      {commentOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="w-full h-full md:h-auto md:max-w-md md:rounded-xl bg-white flex flex-col overflow-hidden p-5">
            <Typography variant="h4" className="font-semibold mb-2">
              {selectedAction === "Reject"
                ? "Reject Reason"
                : "Approval Comment"}
            </Typography>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border rounded-md p-2 text-sm"
              placeholder="Enter comment..."
            />

            <div className="flex justify-end gap-3 mt-4">
              <Button bgColor="gray-200" onClick={() => setCommentOpen(false)}>
                Cancel
              </Button>

              <Button
                bgColor={getActionStyles(selectedAction!).bgColor}
                variant={getActionStyles(selectedAction!).variant}
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

export default LoanDetailsModal;
