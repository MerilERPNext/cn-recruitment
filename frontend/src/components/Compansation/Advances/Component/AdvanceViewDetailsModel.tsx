/* eslint-disable @typescript-eslint/no-explicit-any */

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import useCurrentUser from "../../../../hooks/useCurrentUser";
import {
  EmployeeAdvanceUpdatePayload,
  useEmployeeAdvanceUpdate,
} from "../../../../hooks/useEmployeeAdvances";
import { useExpenseCommentUpdate } from "../../../../hooks/useExpense";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { useGetToDoWithReferenceDoc } from "../../../../hooks/useAttendance";
import Button from "../../../shared/atoms/Button";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import advanceDetailsFormSchema from "./AdvanceDetailsModel.json";
import { Form } from "@tsed/react-formio";
import StatusBadge from "../../../shared/atoms/statusBadge";

type Props = {
  open: boolean;
  item: any;
  documentName: string | null;
  referenceName: string | null;
  onClose: () => void;
  actionsEnabled?: boolean;
};

const AdvanceDetailsModal = ({
  documentName,
  referenceName,
  open,
  item,
  onClose,
  actionsEnabled = true,
}: Props) => {
  const { isDesktop } = useScreenSize();

  // 🔥 Form submission (controlled)
  const [submissionData, setSubmissionData] = useState<any>(null);

  // 🔥 Comment popup state
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [formLiveData, setFormLiveData] = useState<any>({});

  // ─── Fetch data ─────────────────────────
  const {
    data: fetchedData,
    isLoading,
    error,
  } = useGetToDoWithReferenceDoc(
    documentName || "",
    referenceName || "",
  );
  const formatDateForFrappe = (date: string) => {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0]; // ✅ YYYY-MM-DD
  };
  const data = item?.data || fetchedData;
  const ref = data?.reference_document || item?.data;
  const loadingAction = item?.loadingAction;
  const sendBackComment =
    data?.send_back_comment ||
    ref?.send_back_comment ||
    ref?.custom_send_back_comment ||
    ref?.custom_sendback_comment ||
    "";

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const advanceFormUpdate = useEmployeeAdvanceUpdate();
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();

  // 🔥 Auto populate Form.io
  useEffect(() => {
    if (!ref) return;

    setSubmissionData({
      data: {
        employee_name: ref.employee_name || "",
        custom_advance_type: ref.custom_advance_type || "",
        status: ref.status || "",
        advance_amount: ref.advance_amount || "",
        purpose: ref.purpose || "",
        custom_repayment_start_date: ref.custom_repayment_start_date,
        posting_date: ref.posting_date,
        docname: ref.name || data?.reference_name || "",
        reference_doctype: ref.doctype || "Employee Advance",
        todo_id: data?.todo_id || "",
        comment_email: user?.name || "",
      },
    });
  }, [ref, data, user]);

  // 🔥 Open popup on action click
  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setComment("");
    setCommentOpen(true);
  };

  // 🔥 Final submit
  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    if (!comment.trim()) {
      toast.error("Comment is required");
      return;
    }

    const formData = formLiveData;
    const referenceDoctype = ref?.doctype || "Employee Advance";
    const refName = ref?.name || data?.reference_name;
    const safeAdvanceAmount =
    formData.advance_amount !== undefined &&
    formData.advance_amount !== null &&
    formData.advance_amount !== ""
      ? parseFloat(formData.advance_amount)
      : ref?.advance_amount; 
    try {
      // 1️⃣ Save comment
      await commentMutation.mutateAsync({
        referenceDoctype,
        referenceName: refName,
        content: comment,
        comment_email: user?.name || "",
      });

      // 2️⃣ Update advance
      const payload: EmployeeAdvanceUpdatePayload = {
        docname: refName,
        data: {
          advance_amount: safeAdvanceAmount,
          purpose: formData.purpose,
          custom_note_remarks: formData.action_comment,
          posting_date: formatDateForFrappe(formData.posting_date || ref?.posting_date),
          custom_repayment_start_date: formatDateForFrappe(
          formData.custom_repayment_start_date || ref?.custom_repayment_start_date
           ),
          status: selectedAction,
        },
      };

      await advanceFormUpdate.mutateAsync(payload);

      // 3️⃣ Update parent
      if (item?.onAction) {
        item.onAction(selectedAction, {
          ...data,
          reference_document: {
            ...ref,
            ...formData,
          },
        });
      }

      document.dispatchEvent(
        new CustomEvent("approval:acted", { detail: { id: data?.todo_id } }),
      );

      // cleanup
      setComment("");
      setSelectedAction(null);
      setCommentOpen(false);
      onClose();

      toast.success(`${selectedAction} successful`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update");
    }
  };

  // ─── Guards ─────────────────────────
  if (!open) return null;

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
          <Typography variant="bodySmall">
            Error loading details.
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

          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <Typography variant="h4">Advance Details</Typography>
            <Button variant="subtle" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* STATUS */}
          <div className="bg-primary/10 flex justify-between items-center px-4 py-2 m-4 rounded">
            <Typography variant="bodySmall">Status</Typography>
              <StatusBadge status={ref?.status || data?.status} />
          </div>

          <div className="px-4 py-2 m-4 rounded border border-gray-200 bg-gray-50 px-4 py-3">
            <Typography variant="bodySmall" className="mb-1 font-medium text-gray-700">
              Sendback Comment
            </Typography>
            <Typography variant="bodySmall" className="whitespace-pre-wrap break-words text-gray-700">
              {sendBackComment || "--"}
            </Typography>
          </div>

          {/* FORM */}
          <div className="flex-1 overflow-y-auto p-4">
            <Form
              form={advanceDetailsFormSchema}
              submission={submissionData}
              onChange={(form: { data: any; }) => {
              setFormLiveData(form.data); // 🔥 LIVE DATA
              }}
              options={{
                noAlerts: true,
                readOnly: false,
              }}
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="border-t p-4">
            {actionsEnabled && (
              <TeamApprovalActionPill
                variant={isDesktop ? "modal" : "buttons"}
                actions={actions}
                status={ref?.status || data?.status || ""}
                recordId={data?.todo_id}
                loadingAction={loadingAction}
                onAction={handleActionClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* 🔥 COMMENT POPUP */}
      {commentOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-xl p-5 flex flex-col gap-4">

            <Typography variant="h4">
              {selectedAction === "Reject"
                ? "Reject Reason"
                : "Approval Comment"}
            </Typography>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full border rounded-md p-2"
              placeholder="Enter comment..."
            />

            <div className="flex justify-end gap-3">
              <Button bgColor="gray-200" onClick={() => setCommentOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={handleConfirmAction}
                disabled={
                  commentMutation.isPending ||
                  advanceFormUpdate.isPending
                }
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

export default AdvanceDetailsModal;
