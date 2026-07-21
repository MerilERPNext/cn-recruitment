/* eslint-disable @typescript-eslint/no-explicit-any */
import { AttachmentDocument, ExistingAttachment } from "../types/expense.types";

export const getAttachmentIdentity = (attachment: any) => {
  const fileName =
    attachment?.fileDocName ||
    attachment?.originalName ||
    attachment?.name ||
    attachment?.data?.message?.file_name ||
    attachment?.file?.name ||
    "";
  const fileUrl =
    attachment?.url ||
    attachment?.file_url ||
    attachment?.data?.message?.file_url ||
    "";

  return `${fileName}::${fileUrl}`;
};

export const toAttachmentArray = (value: unknown): any[] =>
  Array.isArray(value) ? value : value ? [value] : [];

export const normalizeAttachmentUrl = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "";

  const url = value.trim();

  if (url.startsWith("blob:")) {
    return url;
  }

  if (url.startsWith("http")) {
    try {
      const parsed = new URL(url);
      return parsed.pathname || url;
    } catch {
      return url;
    }
  }

  if (url.startsWith("/")) {
    return url;
  }

  return url.startsWith("files/") ? `/${url}` : `/files/${url}`;
};

export const isPendingLocalAttachment = (attachment: any) => {
  const actualFile = attachment?.file;
  const hasLocalFile = actualFile instanceof Blob || actualFile instanceof File;

  return hasLocalFile && !attachment?.url && !attachment?.file_url;
};

export const findMatchingAttachmentDocument = (
  attachments: AttachmentDocument[],
  attachment: any,
) => {
  const attachmentUrl = normalizeAttachmentUrl(
    attachment?.url ||
      attachment?.file_url ||
      attachment?.data?.message?.file_url,
  );
  const candidateNames = new Set(
    [
      attachment?.fileDocName,
      attachment?.name,
      attachment?.originalName,
      attachment?.data?.message?.file_name,
      attachment?.file?.name,
    ].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    ),
  );

  return attachments.find((doc) => {
    const docUrl = normalizeAttachmentUrl(doc.file_url);

    if (attachmentUrl && docUrl && attachmentUrl === docUrl) {
      return true;
    }

    return Boolean(
      (doc.name && candidateNames.has(doc.name)) ||
      (doc.file_name && candidateNames.has(doc.file_name)),
    );
  });
};

export const areAttachmentListsEqual = (left: any[], right: any[]) => {
  if (left.length !== right.length) return false;

  const leftIds = left.map(getAttachmentIdentity).sort();
  const rightIds = right.map(getAttachmentIdentity).sort();

  return leftIds.every((value, index) => value === rightIds[index]);
};

export const dedupeAttachments = <T,>(attachments: T[]): T[] => {
  const seen = new Set<string>();

  return attachments.filter((attachment) => {
    const identity = getAttachmentIdentity(attachment);

    if (seen.has(identity)) {
      return false;
    }

    seen.add(identity);
    return true;
  });
};

export const normalizeExistingAttachment = (
  value: unknown,
): ExistingAttachment | null => {
  if (typeof value === "string" && value.trim()) {
    const name = value.split("/").pop() || "attachment";
    return {
      name,
      size: 4000,
      url: value,
      file_url: value,
      storage: "url",
      originalName: name,
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const attachment = value as {
    name?: unknown;
    originalName?: unknown;
    url?: unknown;
    file_url?: unknown;
    fileDocName?: unknown;
    file_docname?: unknown;
    size?: unknown;
    type?: unknown;
  };

  const rawUrl =
    typeof attachment.url === "string"
      ? attachment.url
      : typeof attachment.file_url === "string"
        ? attachment.file_url
        : "";

  if (!rawUrl) return null;

  const resolvedName =
    typeof attachment.name === "string" && attachment.name
      ? attachment.name
      : typeof attachment.originalName === "string" && attachment.originalName
        ? attachment.originalName
        : rawUrl.split("/").pop() || "attachment";
  const resolvedSize =
    typeof attachment.size === "number"
      ? attachment.size
      : Number(attachment.size) || 4000;

  return {
    name: resolvedName,
    size: resolvedSize,
    url: rawUrl,
    file_url: rawUrl,
    fileDocName:
      typeof attachment.fileDocName === "string" && attachment.fileDocName
        ? attachment.fileDocName
        : typeof attachment.file_docname === "string" && attachment.file_docname
          ? attachment.file_docname
          : undefined,
    storage: "url",
    originalName:
      typeof attachment.originalName === "string" && attachment.originalName
        ? attachment.originalName
        : resolvedName,
    type: typeof attachment.type === "string" ? attachment.type : undefined,
  };
};

export const mapClaimAttachments = (
  attachments: AttachmentDocument[],
): ExistingAttachment[] =>
  attachments.flatMap((attachment) => {
    const normalized = normalizeExistingAttachment({
      name: attachment.file_name,
      originalName: attachment.file_name,
      url: attachment.file_url,
      file_url: attachment.file_url,
      fileDocName: attachment.name,
      storage: "url",
    });

    return normalized ? [normalized] : [];
  });
