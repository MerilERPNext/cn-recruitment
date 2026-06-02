import FrappeAPI from "../../utils/frappeAPI";
import {
  resolvePendingAttachmentUploads,
  type NormalizedAttachment,
} from "./requestLeaveHelper";

export type ReplaceLeaveFormData = {
  newLeaveType?: string;
  firstHalfType?: string;
  secondHalfType?: string;
  replaceBoth?: boolean;
  description?: string;
  custom_reason?: string;
  attachment?: unknown;
};

export type ReplaceLeaveUploadedAttachments = {
  attatchment?: string;
  attatchment1?: string;
  attatchment2?: string;
};

type FrappeUploadFileResponse = {
  name?: string;
  file_url?: string;
};

/**
 * Standalone upload (no doctype/docname) — same pattern as RequestIssueModal /
 * HelpDesk ChatInput: FrappeAPI.uploadFile with is_private "1".
 * Returns File doctype `name` for replace_leave_application APIs.
 */
const uploadStandaloneFile = async (
  file: File,
  fileName: string,
): Promise<string> => {
  const result: FrappeUploadFileResponse = await FrappeAPI.uploadFile(
    file,
    fileName,
    undefined,
    undefined,
    undefined,
    "1",
  );

  if (!result?.name) {
    throw new Error("File upload failed: File document name was not returned");
  }

  return result.name;
};

const getFileFromAttachment = (
  attachment: NormalizedAttachment,
): File | null => {
  const candidate = attachment.file;
  if (candidate instanceof File) {
    return candidate;
  }
  return null;
};

/**
 * Upload replace-form attachment(s) on submit.
 * Uses customfiles + resolvePendingAttachmentUploads (same as RequestLeave).
 * Returns File doc `name` values for attatchment / attatchment1 / attatchment2.
 */
export async function uploadReplaceLeaveAttachments(
  attachment: unknown,
  replaceBoth: boolean,
): Promise<ReplaceLeaveUploadedAttachments> {
  const pendingUploads = resolvePendingAttachmentUploads(attachment);

  if (pendingUploads.length === 0) {
    return {};
  }

  const firstAttachment = pendingUploads[0];
  const file = getFileFromAttachment(firstAttachment);

  if (!file) {
    return {};
  }

  const uploadFileName = firstAttachment.originalName || file.name;

  if (replaceBoth) {
    const attatchment1 = await uploadStandaloneFile(
      file,
      `${uploadFileName}_attachment1`,
    );
    const attatchment2 = await uploadStandaloneFile(
      file,
      `${uploadFileName}_attachment2`,
    );

    if (attatchment1 === attatchment2) {
      throw new Error(
        "First and second half attachments must be separate File records",
      );
    }

    return { attatchment1, attatchment2 };
  }

  const attatchment = await uploadStandaloneFile(file, uploadFileName);
  return { attatchment };
}
