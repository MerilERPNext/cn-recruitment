/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Form } from "@tsed/react-formio";
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
import { useGetToDoWithReferenceDoc } from "../../../../hooks/useAttendance";
import loanDetailsFormSchema from "./LoanDetailsModel.json";

type Props = {
  open: boolean;
  item: any | null;          // null when opened via direct URL
  documentName?: string;
  referenceName?: string;
  onClose: () => void;
};

const LoanDetailsModal = ({
  documentName,
  referenceName,
  open,
  item,
  onClose,
}: Props) => {
  if (!open) return null;

  // Always call the hook (Rules of Hooks) — skip fetch when item already has data
  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(
    documentName || "",
    referenceName || "",
  );

  const { isDesktop } = useScreenSize();

  // Prefer item.data (row-click path); fall back to fetchedData (direct-URL path)
  const data = item?.data || fetchedData;
  const ref = data?.reference_document;
  const loadingAction = item?.loadingAction;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data.custom_doctype_actions)
    : [];

  const loanFormUpdate = useLoanApplicationUpdate();
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [formLiveData, setFormLiveData] = useState<any>({});

  const formatDateForDisplay = (dateValue?: string) => {
    if (!dateValue) return "";
    const asString = String(dateValue);
    if (/^\d{2}-\d{2}-\d{4}$/.test(asString)) return asString;
    const [year, month, day] = asString.split("T")[0].split("-");
    if (!year || !month || !day) return asString;
    return `${day}-${month}-${year}`;
  };

  const formatDateForFrappe = (dateValue?: string) => {
    if (!dateValue) return "";
    const asString = String(dateValue).split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(asString)) return asString;
    if (/^\d{2}-\d{2}-\d{4}$/.test(asString)) {
      const [day, month, year] = asString.split("-");
      return `${year}-${month}-${day}`;
    }
    return asString;
  };

  // Auto-populate Formio submission data from fetched document.
  useEffect(() => {
    if (!ref) return;
    setSubmissionData({
      data: {
        applicant_name: ref.applicant_name || ref.applicant || "",
        loan_product: ref.loan_product || "",
        loan_amount: ref.loan_amount || "",
        rate_of_interest: ref.rate_of_interest || "",
        repayment_method: ref.repayment_method || "",
        loan_tenure: ref.repayment_periods || "",
        monthly_repayment_amount: ref.repayment_amount || "",
        start_date: formatDateForDisplay(ref.custom_repayment_start_date),
        custom_defered_date: formatDateForDisplay(ref.custom_defered_date),
      },
    });
    setFormLiveData({
      loan_amount: ref.loan_amount || "",
      rate_of_interest: ref.rate_of_interest || "",
      repayment_method: ref.repayment_method || "",
      loan_tenure: ref.repayment_periods || "",
      monthly_repayment_amount: ref.repayment_amount || "",
      start_date: formatDateForDisplay(ref.custom_repayment_start_date),
      custom_defered_date: formatDateForDisplay(ref.custom_defered_date),
    });
  }, [ref]);

  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

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
    // Use ref name, or fall back to URL param referenceName
    const refDocName = ref?.name || data?.reference_name || referenceName;

    try {
      await commentMutation.mutateAsync({
        referenceDoctype,
        referenceName: refDocName,
        content: comment,
        comment_email: user?.name || "",
      });

      const payload: LoanApplicationUpdatePayload = {
        docname: refDocName,
        data: {
          loan_amount: Number(formLiveData.loan_amount),
          rate_of_interest: Number(formLiveData.rate_of_interest),
          custom_repayment_start_date: formatDateForFrappe(
            formLiveData.start_date,
          ),
          custom_defered_date: formatDateForFrappe(
            formLiveData.custom_defered_date,
          ),
          repayment_method: formLiveData.repayment_method,
          status: selectedAction,

          ...(formLiveData.repayment_method ===
            "Repay Fixed Amount per Period" && {
            repayment_amount: Number(formLiveData.monthly_repayment_amount),
          }),

          ...(formLiveData.repayment_method ===
            "Repay Over Number of Periods" && {
            repayment_periods: Number(formLiveData.loan_tenure),
          }),
        },
      };

      await loanFormUpdate.mutateAsync(payload);

      // Only call onAction if item was passed (row-click path)
      if (item?.onAction) {
        item.onAction(selectedAction, {
          ...data,
          reference_document: {
            ...ref,
            ...formLiveData,
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

  // Show loader only in direct-URL path (item is null and fetch is in progress)
  if (!item && isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <Typography variant="bodySmall">Loading...</Typography>
        </div>
      </div>
    );
  }

  if (!item && error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 flex flex-col gap-4">
          <Typography variant="bodySmall" color="body2">
            Error loading loan details.
          </Typography>
          <Button bgColor="gray-200" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

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

            <div>
              <Form
                form={loanDetailsFormSchema}
                submission={submissionData}
                onChange={(form: { data: any }) => {
                  setFormLiveData((prev: any) => ({
                    ...prev,
                    ...form.data,
                  }));
                }}
                options={{
                  noAlerts: true,
                  readOnly: false,
                }}
              />
            </div>
          </div>

          {/* ACTION BUTTONS — sticky at bottom */}
          <div className="border-t bg-white p-4">
           {data.todo_status != "Closed" &&  <TeamApprovalActionPill
              variant={isDesktop ? "modal" : "buttons"}
              actions={actions}
              status={ref?.status || data?.status || ""}
              recordId={data?.todo_id}
              loadingAction={loadingAction}
              onAction={(action) => handleActionClick(action)}
            />}
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