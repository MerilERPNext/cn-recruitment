/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.min.css";
import { createPortal } from "react-dom";

import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import {
  LoanApplicationUpdatePayload,
  useLoanApplicationUpdate,
} from "../../../../hooks/useLoan";
import Button from "../../../shared/atoms/Button";
import StatusBadge from "../../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { useGetToDoWithReferenceDoc } from "../../../../hooks/useAttendance";

type Props = {
  open: boolean;
  item: any;
  onClose: () => void;
};

const LoanDetailsModal = ({ open, item, onClose }: Props) => {
  if (!open || !item) return null;

  const { isDesktop } = useScreenSize();
  const todo_id = item?.todo_id;
  const document_name = item?.document_name;

  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(todo_id || "", document_name || "");

  const data = item.data || fetchedData;
  const ref = data?.reference_document;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data.custom_doctype_actions)
    : [];

  const loanFormUpdate = useLoanApplicationUpdate();
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();

  const [form, setForm] = useState<any>({});
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // ✅ Form.io Schema
  const loanSchema = {
    display: "form",
    components: [
      {
        type: "columns",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "number",
                key: "loan_amount",
                label: "Loan Amount",
                input: true,
                validate: { required: true },
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "number",
                key: "rate_of_interest",
                label: "Rate of Interest (%)",
                input: true,
                validate: { required: true },
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "select",
                key: "repayment_method",
                label: "Repayment Type",
                input: true,
                data: {
                  values: [
                    {
                      label: "Repay Fixed Amount per Period",
                      value: "Repay Fixed Amount per Period",
                    },
                    {
                      label: "Repay Over Number of Periods",
                      value: "Repay Over Number of Periods",
                    },
                  ],
                },
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "number",
                key: "loan_tenure",
                label: "Loan Tenure",
                input: true,
                conditional: {
                  when: "repayment_method",
                  eq: "Repay Over Number of Periods",
                },
              },
            ],
          },
        ],
      },
      {
        type: "columns",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "number",
                key: "monthly_repayment_amount",
                label: "Monthly Repayment Amount",
                input: true,
                conditional: {
                  when: "repayment_method",
                  eq: "Repay Fixed Amount per Period",
                },
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "start_date",
                label: "Start Date",
                format: "yyyy-MM-dd",
                enableTime: false,
                input: true,
              },
            ],
          },
        ],
      },
      {
        type: "datetime",
        key: "custom_defered_date",
        label: "Deferment Date",
        format: "yyyy-MM-dd",
        enableTime: false,
        input: true,
      },
    ],
  };

  // ✅ Prefill
  const loanSubmission = {
    data: {
      loan_amount: ref?.loan_amount ?? "",
      rate_of_interest: ref?.rate_of_interest ?? "",
      loan_tenure: ref?.repayment_periods ?? "",
      monthly_repayment_amount: ref?.repayment_amount ?? "",
      repayment_method: ref?.repayment_method ?? "",
      start_date: ref?.custom_repayment_start_date?.slice(0, 10) ?? "",
      custom_defered_date: ref?.custom_defered_date?.slice(0, 10) ?? "",
    },
  };

  const handleFormChange = (submission: any) => {
    const d = submission?.data;
    if (!d) return;
    setForm(d);
  };

  const handleCancelComment = () => {
    setCommentOpen(false);
    setComment("");
    setSelectedAction(null);
  };

  // ✅ Approve aur Reject DONO pe comment modal open hoga
  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setComment("");
    setCommentOpen(true);
  };

  // ✅ Comment save karke action chalao — dono ke liye mandatory
  const handleSaveComment = async () => {
    if (!comment.trim()) {
      toast.error("Comment is required");
      return;
    }
    const actionToSubmit = selectedAction!;
    const commentToSubmit = comment;
    handleCancelComment();
    await handleSubmitAction(actionToSubmit, commentToSubmit);
  };

  // ✅ Core submit logic
  const handleSubmitAction = async (action: string, finalComment: string) => {
    if (!action) return;

    const referenceName = ref?.name || data?.reference_name;

    try {
      await commentMutation.mutateAsync({
        referenceDoctype: "Loan Application",
        referenceName,
        content: finalComment,
        comment_email: user?.name || "",
      });

      const payload: LoanApplicationUpdatePayload = {
        docname: referenceName,
        data: {
          loan_amount: Number(form.loan_amount),
          rate_of_interest: Number(form.rate_of_interest),
          repayment_method: form.repayment_method,
          custom_repayment_start_date: form.start_date,
          custom_defered_date: form.custom_defered_date,
          status: action,

          ...(form.repayment_method === "Repay Fixed Amount per Period" && {
            repayment_amount: Number(form.monthly_repayment_amount),
          }),

          ...(form.repayment_method === "Repay Over Number of Periods" && {
            repayment_periods: Number(form.loan_tenure),
          }),
        },
      };

      await loanFormUpdate.mutateAsync(payload);

      toast.success(`${action} successful`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error</div>;

  return (
    <>
      {/* MAIN MODAL */}
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="w-full md:max-w-2xl bg-white rounded-lg flex flex-col">

          <div className="flex justify-between p-4 border-b">
            <Typography variant="h4">Loan Details</Typography>
            <Button variant="subtle" onClick={onClose}>
              <X />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex justify-between bg-primary/20 p-2 rounded">
              <Typography>Status</Typography>
              <StatusBadge status={ref?.status} />
            </div>

            <Form
              form={loanSchema}
              submission={loanSubmission}
              onChange={handleFormChange}
              options={{ noAlerts: true }}
            />
          </div>

          <div className="p-4 border-t">
            <TeamApprovalActionPill
              variant={isDesktop ? "modal" : "buttons"}
              actions={actions}
              status={ref?.status || ""}
              recordId={data?.todo_id}
              loadingAction={item.loadingAction}
              onAction={handleActionClick}
            />
          </div>
        </div>
      </div>

      {/* COMMENT MODAL — createPortal se document.body pe, z-[60] taaki main modal ke upar aaye */}
      {commentOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              handleCancelComment();
            }}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Comment Required
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please add a comment before{" "}
                {selectedAction?.toLowerCase()}ing this loan application.
              </p>
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase mb-1 block">
                  COMMENT *
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter your comment..."
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
                  disabled={!comment.trim() || commentMutation.isPending}
                >
                  {commentMutation.isPending ? (
                    <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    `Save & ${selectedAction}`
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )
      }
    </>
  );
};

export default LoanDetailsModal;