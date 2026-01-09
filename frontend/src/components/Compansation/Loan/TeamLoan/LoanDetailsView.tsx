/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Button from "../../../shared/atoms/Button";
import { StatusBadge } from "../../../ShiftRequest/AllShiftsDashboard";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import toast from "react-hot-toast";
import { LoanApplicationUpdatePayload, useLoanApplicationUpdate } from "../../../../hooks/useLoan";

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
  const ref = data?.reference_document;
  const loadingAction = item.loadingAction;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data.custom_doctype_actions)
    : [];
  const loanFormUpdate = useLoanApplicationUpdate()
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();

  /* editable fields */
  const [form, setForm] = useState({
    loan_amount: ref?.loan_amount || "",
    rate_of_interest: ref?.rate_of_interest || "",
    loan_tenure: ref?.loan_tenure || "",
    start_date: ref?.custom_repayment_start_date || "",
    end_date: ref?.custom_repayment_end_date || "",
    deferment_date: ref?.loan_deferment_date || "",
  });



  /* comment modal */
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  /* approve / reject click */
  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setComment("");
    setCommentOpen(true); // only comment modal opens
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
      // 1️⃣ Save comment first
      await commentMutation.mutateAsync({
        referenceDoctype,
        referenceName,
        content: comment,
        comment_email: user?.name || "",
      });

      // 2️⃣ Prepare payload for loan update API
      const payload: LoanApplicationUpdatePayload = {
        docname: referenceName, // Loan Application document name
        data: {
          loan_amount: parseFloat(form.loan_amount),
          rate_of_interest: parseFloat(form.rate_of_interest),
          loan_tenure: parseFloat(form.loan_tenure),
          custom_repayment_start_date: form.start_date,
          custom_repayment_end_date: form.end_date,
          loan_deferment_date: form.deferment_date,
          status: selectedAction,
        },
      };
      console.log("Payload for loan update:", payload);

      // 3️⃣ Trigger loan update mutation
      await loanFormUpdate.mutateAsync(payload);

      // 4️⃣ Update UI / parent
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
        <div className="bg-white w-full max-w-3xl rounded-xl p-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-lg font-semibold">Loan Details</h2>
            <button onClick={onClose} className="text-xl">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <ReadOnly label="Employee">{ref?.applicant_name}</ReadOnly>
            <ReadOnly label="Loan Type">{ref?.loan_product}</ReadOnly>

            {/* Editable fields remain here in main modal */}
            <Input label="Loan Amount" name="loan_amount" value={form.loan_amount} onChange={handleChange} />
            <Input label="Rate of Interest (%)" name="rate_of_interest" value={form.rate_of_interest} onChange={handleChange} />
            <Input label="Loan Tenure" name="loan_tenure" value={form.loan_tenure} onChange={handleChange} />
            <Input type="date" label="Start Date" name="start_date" value={form.start_date} onChange={handleChange} />
            <Input type="date" label="End Date" name="end_date" value={form.end_date} onChange={handleChange} />
            <Input type="date" label="Deferment Date" name="deferment_date" value={form.deferment_date} onChange={handleChange} />

            <ReadOnly label="Status">
              <StatusBadge status={ref?.status} />
            </ReadOnly>
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

      {/* COMMENT MODAL ONLY */}
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
              <Button onClick={() => setCommentOpen(false)}>
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

/* helpers */
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
