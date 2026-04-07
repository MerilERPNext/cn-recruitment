import { createPortal } from "react-dom";
import Button from "./atoms/Button";
import { Typography } from "./atoms/Typography";
import { getActionStyles } from "../../utils/actionButtonStyles";

interface ApprovalCommentModalProps {
  open: boolean;
  action: string | null;
  comment: string;
  onCommentChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  placeholder?: string;
}

const ApprovalCommentModal = ({
  open,
  action,
  comment,
  onCommentChange,
  onCancel,
  onSave,
  isSaving,
  placeholder = "Enter comment...",
}: ApprovalCommentModalProps) => {
  if (!open || !action) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-md md:rounded-xl bg-white flex flex-col overflow-hidden p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Typography variant="h4" className="font-semibold mb-2">
          {`${action} Reason`}
        </Typography>

        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={4}
          className="w-full border rounded-md p-2 text-sm"
          placeholder={placeholder}
        />

        <div className="flex justify-end gap-3 mt-4">
          <Button bgColor="text" variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <Button
            bgColor={getActionStyles(action).bgColor}
            variant={getActionStyles(action).variant}
            onClick={onSave}
            disabled={!comment.trim() || isSaving}
            loading={isSaving}
          >
            Save & Continue
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ApprovalCommentModal;
