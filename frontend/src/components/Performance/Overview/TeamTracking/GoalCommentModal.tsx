import React, { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import Modal from "../../../shared/Modal";
import Button from "../../../shared/atoms/Button";
import { Typography } from "../../../shared/atoms/Typography";
import toast from "react-hot-toast";

interface GoalCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (comment: string) => void;
  employeeId?: string;
  goal: string;
}

export const GoalCommentModal: React.FC<GoalCommentModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  goal
}) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Please enter a comment before submitting.");
      return;
    }

  console.log(employeeId,goal,comment)
  };

  const handleClose = () => {
    setComment("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <Typography variant="h3" className="text-gray-900 font-bold text-base sm:text-lg">
                Add Goal Comment
              </Typography>
              <Typography variant="caption" className="text-gray-500 text-xs">
                Share updates, progress feedback, or key notes
              </Typography>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="goal-comment-textarea" className="text-xs font-semibold text-gray-700 tracking-wide">
              Your Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              id="goal-comment-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your feedback, progress updates, or notes here..."
              className="w-full min-h-[120px] p-3 text-sm text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all placeholder:text-gray-400"
              maxLength={500}
            />
            <div className="flex justify-end items-center text-[11px] text-gray-400 px-1">
              <span>{comment.length} / 500</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 px-4 h-10 text-xs font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="contain"
              bgColor="primary"
              size="md"
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || !comment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 h-10 text-xs font-medium cursor-pointer"
            >
              Submit Comment
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
