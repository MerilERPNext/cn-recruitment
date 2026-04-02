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
import { getActionStyles } from "../../../../utils/actionButtonStyles";
import Button from "../../../shared/atoms/Button";
import StatusBadge from "../../../shared/atoms/statusBadge";
import TeamApprovalActionPill from "../../../shared/atoms/TeamApprovalActionPill";
import { Typography } from "../../../shared/atoms/Typography";
import { useGetToDoWithReferenceDoc } from "../../../../hooks/useAttendance";

type Props = {
  open: boolean;
  item: any;
  documentName: string | null;
  referenceName: string | null;
  onClose: () => void;
};

const AdvanceDetailsModal = ({ 
  documentName,
  referenceName,
  open,
  item,
  onClose,
}: Props) => {
  const { isDesktop } = useScreenSize();
    const {
      data: fetchedData,
      isLoading,
      error,
    } = useGetToDoWithReferenceDoc(
      documentName || "",
      referenceName || "",
    );

  const data = item?.data || fetchedData;
  const ref = data?.reference_document || item?.data;
  const loadingAction = item?.loadingAction;

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];
  const advanceFormUpdate = useEmployeeAdvanceUpdate();
  const commentMutation = useExpenseCommentUpdate();
  const { data: user } = useCurrentUser();
  const [form, setForm] = useState({
    advance_amount: ref?.advance_amount || "",
    purpose: ref?.purpose || "",
    start_date: ref?.custom_repayment_start_date || "",
    posting_date: ref?.posting_date || "",
  });

    useEffect(() => {
      if (ref) {
        setForm({
          advance_amount: ref?.advance_amount || "",
          purpose: ref?.purpose || "",
          posting_date: ref?.posting_date || "",
          start_date: ref?.custom_repayment_start_date || "",
        });

      }
    }, [ref]);

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
              Advance Details
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
                    {ref?.employee_name}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <Typography variant="mobileCardLabel" className="block">
                    Advance Type
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {ref?.custom_advance_type}
                  </Typography>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Advance Amount
                </Typography>
                <input
                  name="advance_amount"
                  value={form.advance_amount}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Purpose
                </Typography>
                <input
                  name="purpose"
                  value={form.purpose}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
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
                  Posting Date
                </Typography>
                <input
                  type="date"
                  name="posting_date"
                  value={form.posting_date}
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

export default AdvanceDetailsModal;
