import FrappeAPI from "../../utils/frappeAPI";

type AttachmentMessage = {
  file_url?: string;
  file_name?: string;
};

type AttachmentData = {
  message?: AttachmentMessage;
};

type AttachmentRecord = Record<string, unknown> & {
  data?: unknown;
  file?: unknown;
  file_url?: unknown;
  name?: unknown;
  originalName?: unknown;
  url?: unknown;
};

export type NormalizedAttachment = AttachmentRecord & {
  data?: AttachmentData;
  file?: File | Blob;
  file_url?: string;
  name: string;
  originalName: string;
  url?: string;
};

export type LeaveApplicationTarget = {
  doctype: string;
  docname: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const getNestedRecord = (
  value: unknown,
  key: string,
): Record<string, unknown> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const nestedValue = value[key];
  return isRecord(nestedValue) ? nestedValue : undefined;
};

const getNestedString = (value: unknown, path: string[]): string | undefined => {
  let current: unknown = value;

  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return getStringValue(current);
};

const getAttachmentMessage = (value: unknown): AttachmentMessage | undefined => {
  const message = getNestedRecord(value, "message");

  if (!message) {
    return undefined;
  }

  const fileUrl = getStringValue(message.file_url);
  const fileName = getStringValue(message.file_name);

  if (!fileUrl && !fileName) {
    return undefined;
  }

  return {
    file_url: fileUrl,
    file_name: fileName,
  };
};

const resolveAttachmentFile = (fileCandidate: unknown) => {
  if (
    fileCandidate &&
    (fileCandidate instanceof File || fileCandidate instanceof Blob)
  ) {
    return fileCandidate;
  }

  return undefined;
};

export const hasValidAttachmentFile = (attachment: NormalizedAttachment) =>
  attachment.file instanceof File || attachment.file instanceof Blob;

/** Read live file rows from a Form.io file component (avoids JSON-serialized submission). */
export const getFormioAttachmentFileItems = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formInstance: { getComponent?: (key: string) => any } | null,
  componentKey: string,
): unknown[] => {
  const component = formInstance?.getComponent?.(componentKey);
  if (!component) {
    return [];
  }

  const candidates = [component.dataValue, component.value, component._data];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const items = Array.isArray(candidate) ? candidate : [candidate];
    const hasLiveFile = items.some(
      (item) => isRecord(item) && item.file instanceof File,
    );

    if (hasLiveFile) {
      return items;
    }
  }

  return [];
};

const expandAttachmentGroup = (group: unknown): unknown[] => {
  if (Array.isArray(group)) {
    return group;
  }

  if (!group) {
    return [];
  }

  if (typeof group === "string") {
    const trimmedGroup = group.trim();

    if (!trimmedGroup) {
      return [];
    }

    const looksSerialized =
      (trimmedGroup.startsWith("[") && trimmedGroup.endsWith("]")) ||
      (trimmedGroup.startsWith("{") && trimmedGroup.endsWith("}"));

    if (looksSerialized) {
      try {
        const parsedGroup = JSON.parse(trimmedGroup);
        return Array.isArray(parsedGroup) ? parsedGroup : [parsedGroup];
      } catch {
        return [trimmedGroup];
      }
    }

    return [trimmedGroup];
  }

  return [group];
};

const normalizeAttachmentEntry = (
  attachment: unknown,
): NormalizedAttachment | null => {
  if (!attachment) {
    return null;
  }

  if (typeof attachment === "string") {
    const resolvedUrl = attachment.trim();

    if (!resolvedUrl) {
      return null;
    }

    const resolvedName = resolvedUrl.split("/").pop() || "attachment";

    return {
      name: resolvedName,
      originalName: resolvedName,
      url: resolvedUrl,
      file_url: resolvedUrl,
    };
  }

  if (typeof attachment !== "object") {
    return null;
  }

  const attachmentRecord = attachment as AttachmentRecord;
  const actualFile = resolveAttachmentFile(attachmentRecord.file);
  const message = getAttachmentMessage(attachmentRecord.data);
  const resolvedUrl =
    getStringValue(attachmentRecord.url) ||
    getStringValue(attachmentRecord.file_url) ||
    message?.file_url ||
    "";
  const resolvedName =
    getStringValue(attachmentRecord.originalName) ||
    getStringValue(attachmentRecord.name) ||
    message?.file_name ||
    (actualFile instanceof File ? actualFile.name : undefined) ||
    resolvedUrl.split("/").pop() ||
    "attachment";

  const normalizedAttachment = {
    ...attachmentRecord,
    file: actualFile,
    name: resolvedName,
    originalName: resolvedName,
    url: resolvedUrl || undefined,
    file_url: resolvedUrl || undefined,
  } as NormalizedAttachment;

  if (message) {
    normalizedAttachment.data = { message };
  }

  return normalizedAttachment;
};

export const normalizeAttachments = (
  ...attachmentGroups: unknown[]
): NormalizedAttachment[] => {
  const seen = new Set<string>();

  return attachmentGroups
    .flatMap(expandAttachmentGroup)
    .map(normalizeAttachmentEntry)
    .filter((attachment): attachment is NonNullable<typeof attachment> => {
      if (!attachment) {
        return false;
      }

      const identity = [
        (attachment.file instanceof File ? attachment.file.name : ""),
        attachment.file?.size !== undefined ? String(attachment.file.size) : "",
        attachment.file instanceof File
          ? String(attachment.file.lastModified)
          : "",
        attachment.name || "",
        attachment.originalName || "",
        attachment.url || attachment.file_url || "",
      ].join("::");

      if (seen.has(identity)) {
        return false;
      }

      seen.add(identity);
      return Boolean(attachment.file || attachment.url || attachment.file_url);
    });
};

export const getPendingAttachmentUploads = (
  attachments: NormalizedAttachment[],
) =>
  attachments.filter(
    (attachment) =>
      hasValidAttachmentFile(attachment) &&
      !attachment.url &&
      !attachment.file_url &&
      !attachment.data?.message?.file_url,
  );

/** Same resolution as RequestLeave / BulkLeaveModal before calling upload. */
export const resolvePendingAttachmentUploads = (
  ...attachmentGroups: unknown[]
): NormalizedAttachment[] => {
  const normalizedAttachments = normalizeAttachments(...attachmentGroups);
  const directPendingUploads = getPendingAttachmentUploads(
    normalizedAttachments,
  );

  if (directPendingUploads.length > 0) {
    return directPendingUploads;
  }

  return normalizedAttachments.filter(hasValidAttachmentFile);
};

export const getExistingAttachmentUrls = (attachments: NormalizedAttachment[]) =>
  attachments
    .map(
      (attachment) =>
        attachment.url ||
        attachment.file_url ||
        attachment.data?.message?.file_url ||
        "",
    )
    .filter((url): url is string => typeof url === "string" && url.length > 0);

export const resolveLeaveApplicationTarget = (
  response: unknown,
): LeaveApplicationTarget | null => {
  const docname =
    getNestedString(response, ["leave_application", "name"]) ||
    getNestedString(response, ["leave_application"]) ||
    getNestedString(response, ["name"]) ||
    getNestedString(response, ["data", "name"]) ||
    getNestedString(response, ["message", "name"]) ||
    getNestedString(response, ["message", "leave_application"]) ||
    "";
  const doctype =
    getNestedString(response, ["leave_application", "doctype"]) ||
    getNestedString(response, ["doctype"]) ||
    getNestedString(response, ["data", "doctype"]) ||
    getNestedString(response, ["message", "doctype"]) ||
    "Leave Application";

  return docname ? { doctype, docname } : null;
};

const getNestedArray = (value: unknown, path: string[]): unknown[] | undefined => {
  let current: unknown = value;

  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return Array.isArray(current) ? current : undefined;
};

export const resolveLeaveApplicationTargets = (
  response: unknown,
): Array<LeaveApplicationTarget | null> => {
  const targetCollections = [
    getNestedArray(response, ["leave_applications"]),
    getNestedArray(response, ["leave_application"]),
    getNestedArray(response, ["applications"]),
    getNestedArray(response, ["data", "leave_applications"]),
    getNestedArray(response, ["data", "leave_application"]),
    getNestedArray(response, ["data", "applications"]),
    getNestedArray(response, ["message", "leave_applications"]),
    getNestedArray(response, ["message", "leave_application"]),
    getNestedArray(response, ["message", "applications"]),
    getNestedArray(response, ["data"]),
    getNestedArray(response, ["message"]),
  ];

  for (const collection of targetCollections) {
    if (Array.isArray(collection)) {
      return collection.map((item) => resolveLeaveApplicationTarget(item));
    }
  }

  const singleTarget = resolveLeaveApplicationTarget(response);
  return singleTarget ? [singleTarget] : [];
};

export const findRecentLeaveApplicationTarget = async ({
  employee,
  leaveType,
  fromDate,
  toDate,
}: {
  employee: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  if (!employee || !leaveType || !fromDate || !toDate) {
    return null;
  }

  const result = await FrappeAPI.getDocumentList("Leave Application", {
    fields: ["name"],
    filters: [
      ["employee", "=", employee],
      ["leave_type", "=", leaveType],
      ["from_date", "=", fromDate],
      ["to_date", "=", toDate],
    ],
    orderBy: "creation desc",
    limit: 1,
  });

  const latestLeave = result.data?.[0] as { name?: string } | undefined;
  return latestLeave?.name
    ? { doctype: "Leave Application", docname: latestLeave.name }
    : null;
};
