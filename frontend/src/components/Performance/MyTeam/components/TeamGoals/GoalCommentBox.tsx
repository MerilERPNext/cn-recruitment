import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Typography } from "../../../../shared/atoms/Typography";
import Button from "../../../../shared/atoms/Button";
import { useAddTeamGoalComment } from "../../../../../hooks/usePerformance";
import { getPerformanceErrorMessage } from "../../../../../services/performanceService";

interface GoalCommentBoxProps {
  employee: string;
  goalKey: string;
  employeeName?: string;
  comment?: string;
  onCommentChange?: (value: string) => void;
  className?: string;
}

export const GoalCommentBox: React.FC<GoalCommentBoxProps> = ({
  employee,
  goalKey,
  employeeName,
  comment: externalComment,
  onCommentChange,
  className,
}) => {
  const [internalComment, setInternalComment] = useState("");

  const isControlled = externalComment !== undefined && onCommentChange !== undefined;
  const comment = isControlled ? externalComment : internalComment;

  const handleTextChange = (val: string) => {
    if (isControlled) {
      onCommentChange?.(val);
    } else {
      setInternalComment(val);
    }
  };

  const { mutate: addGoalComment, isPending } = useAddTeamGoalComment();

  const handlePostComment = () => {
    if (!comment.trim()) return;
    addGoalComment(
      { payload: { employee, goal_key: goalKey, note: comment.trim() } },
      {
        onSuccess: (res) => {
          toast.success(res?.message || "Comment added successfully.");
          handleTextChange("");
        },
        onError: (err) => {
          toast.error(getPerformanceErrorMessage(err, "Failed to add comment."));
        },
      }
    );
  };

  const displayName = employeeName ? employeeName.split(" ")[0] : employee;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <Typography variant="bodySmall" className="font-medium text-gray-900 block">
          Add comment{" "}
          <span className="text-gray-400 font-normal">
            (visible to {displayName})
          </span>
        </Typography>
        <Typography variant="caption" className="text-slate-400 italic">
          Submit comment without deciding
        </Typography>
      </div>
      <textarea
        aria-label={`Add comment for ${displayName}`}
        value={comment}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Type your comment/note for the employee here..."
        rows={3}
        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm"
      />
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span>Post feedback or note for employee without changing goal status.</span>
        </p>
        <Button
          type="button"
          variant="contain"
          size="sm"
          disabled={!comment.trim() || isPending}
          onClick={handlePostComment}
          className="border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-xs text-xs px-3 py-1.5 font-semibold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-3.5 w-3.5 mr-1 shrink-0 text-white" />
          <span>{isPending ? "Posting..." : "Post Comment"}</span>
        </Button>
      </div>
    </div>
  );
};

export default GoalCommentBox;
