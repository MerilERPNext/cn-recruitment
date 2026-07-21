import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  commentService,
  CreateCommentPayload,
} from "../services/commentService";
import { errorResponseFormater } from "../utils/errorResponseFormater";

/**
 * Unified hook for creating approval/rejection comments using
 * FrappeAPI.createDocument("Comment", ...).
 *
 * Replaces module-specific hooks:
 *  - useUpdateRejectionReason (Leaves)
 *  - useUpdateAttendanceRejectionReason (Attendance)
 *  - useExpenseCommentUpdate (Expenses)
 */
export function useCreateApprovalComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCommentPayload) =>
      commentService.createApprovalComment(payload),

    onSuccess: () => {
      // Invalidate all relevant queries across modules
      queryClient.invalidateQueries({ queryKey: ["teamRequests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-request"] });
      queryClient.invalidateQueries({ queryKey: ["my-attendance-requests"] });
      queryClient.invalidateQueries({ queryKey: ["expense-claims"] });
      queryClient.invalidateQueries({ queryKey: ["todo"] });
      queryClient.invalidateQueries({ queryKey: ["todo-refdocs"] });
      queryClient.invalidateQueries({ queryKey: ["todo-approvals"] });
    },

    onError: (err: unknown) => {
      console.error("Failed to create approval comment:", err);
      toast.error(
        errorResponseFormater(err, "Failed to save comment. Please try again."),
      );
    },
  });
}
