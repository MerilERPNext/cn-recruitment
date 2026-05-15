import FrappeAPI from "../../utils/frappeAPI";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolveAttachmentFile = (fileCandidate: any) => {
  if (
    fileCandidate &&
    (fileCandidate instanceof File || fileCandidate instanceof Blob)
  ) {
    return fileCandidate;
  }

  return undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expandAttachmentGroup = (group: any) => {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeAttachmentEntry = (attachment: any) => {
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

  const actualFile = resolveAttachmentFile(attachment.file);
  const resolvedUrl =
    typeof attachment.url === "string" && attachment.url
      ? attachment.url
      : typeof attachment.file_url === "string" && attachment.file_url
        ? attachment.file_url
        : typeof attachment.data?.message?.file_url === "string" &&
            attachment.data.message.file_url
          ? attachment.data.message.file_url
          : "";
  const resolvedName =
    typeof attachment.originalName === "string" && attachment.originalName
      ? attachment.originalName
      : typeof attachment.name === "string" && attachment.name
        ? attachment.name
        : typeof attachment.data?.message?.file_name === "string" &&
            attachment.data.message.file_name
          ? attachment.data.message.file_name
          : (actualFile instanceof File ? actualFile.name : undefined) || resolvedUrl.split("/").pop() || "attachment";

  return {
    ...attachment,
    file: actualFile,
    name: resolvedName,
    originalName: resolvedName,
    url: resolvedUrl || undefined,
    file_url: resolvedUrl || undefined,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizeAttachments = (...attachmentGroups: any[]) => {
  const seen = new Set<string>();

  return attachmentGroups
    .flatMap(expandAttachmentGroup)
    .map(normalizeAttachmentEntry)
    .filter((attachment): attachment is NonNullable<typeof attachment> => {
      if (!attachment) {
        return false;
      }

      const identity = [
        attachment.file?.name || "",
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPendingAttachmentUploads = (attachments: any[]) =>
  attachments.filter(
    (attachment) =>
      Boolean(attachment.file) &&
      !attachment.url &&
      !attachment.file_url &&
      !attachment.data?.message?.file_url,
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getExistingAttachmentUrls = (attachments: any[]) =>
  attachments
    .map(
      (attachment) =>
        attachment.url ||
        attachment.file_url ||
        attachment.data?.message?.file_url ||
        "",
    )
    .filter((url): url is string => typeof url === "string" && url.length > 0);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resolveLeaveApplicationTarget = (response: any) => {
  const docname =
    response?.leave_application?.name ||
    response?.leave_application ||
    response?.name ||
    response?.data?.name ||
    response?.message?.name ||
    response?.message?.leave_application ||
    "";
  const doctype =
    response?.leave_application?.doctype ||
    response?.doctype ||
    response?.data?.doctype ||
    response?.message?.doctype ||
    "Leave Application";

  return docname ? { doctype, docname } : null;
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
