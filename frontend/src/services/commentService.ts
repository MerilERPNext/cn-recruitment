import FrappeAPI from "../utils/frappeAPI";

export interface CreateCommentPayload {
  comment_type: "Submitted" | "Cancelled";
  reference_doctype: string;
  reference_name: string;
  comment_email: string;
  comment_by: string;
  content: string;
  subject?: string;
}

export const commentService = {
  /**
   * Creates a Comment document using FrappeAPI.createDocument.
   * Used for approval/rejection comments across Leave, Attendance, and Expense modules.
   *
   * @param payload - The comment data to create.
   *   - comment_type: "Submitted" for Approve actions, "Cancelled" for Reject actions.
   *   - reference_doctype: The doctype being acted upon (e.g., "Leave Application", "Attendance Request", "Expense Claim").
   *   - reference_name: The document name/ID being acted upon.
   *   - comment_email: Current user's email.
   *   - comment_by: Current user's email.
   *   - content: The reason/message entered by the user.
   */
  createApprovalComment: async (
    payload: CreateCommentPayload,
  ): Promise<unknown> => {
    return FrappeAPI.createDocument("Comment", {
      comment_type: payload.comment_type,
      reference_doctype: payload.reference_doctype,
      reference_name: payload.reference_name,
      comment_email: payload.comment_email,
      comment_by: payload.comment_by,
      content: payload.content,
      subject: payload.subject,
    });
  },
};
