/* eslint-disable @typescript-eslint/no-explicit-any */
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { expenseSchema } from "./expenseSchema";
import {
  useCurrentEmployeeAllDetails,
  useEmployees,
} from "../../../hooks/useEmployee";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useCalculateExpenseAmount,
  useGetExpenseTypeFields,
  useGetExpenseAttachments,
  usePostExpenseClaim,
  useGetUnitPrice,
  useUpdateExpense,
  useValidateExpense,
  useDeleteExpenseAttachment,
  useUpdateFileAttachment,
} from "../../../hooks/useExpense";
import { buildExpenseTypeDynamicSchema } from "./expenseTypeFieldsMapper";
import ExpenseFieldSkeleton from "./ExpenseFieldSkeleton";
import Button from "../../shared/atoms/Button";
import ParticipantsDrawer from "./ParticipantDrawer";
import toast from "react-hot-toast";
import { format, isValid, parseISO } from "date-fns";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { useNavigate } from "react-router-dom";
import { SquarePen, Trash2 } from "lucide-react";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { FilePreviewModal } from "../../shared/molecules/FilePreviewModal";
import { ExpenseNavigationExpense } from "./expenseNavigationHelper";
import { FrappeAPI } from "../../../utils/frappeAPI";

const normalizeDateOnly = (value: unknown) => {
  if (!value) return value;

  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd");
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return [
        String(year),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }

    const isoCandidate = value.includes(" ") ? value.replace(" ", "T") : value;
    const parsedFromIso = parseISO(isoCandidate);
    if (isValid(parsedFromIso)) {
      return format(parsedFromIso, "yyyy-MM-dd");
    }

    const parsedFromDate = new Date(value);
    if (!Number.isNaN(parsedFromDate.getTime())) {
      return format(parsedFromDate, "yyyy-MM-dd");
    }
  }

  return value;
};

const normalizeExpensePayloadData = (data: Record<string, any>) => {
  const normalizedData = { ...data };

  if (normalizedData.expense_date) {
    normalizedData.expense_date = normalizeDateOnly(
      normalizedData.expense_date,
    );
  }

  if (normalizedData.start_datetime) {
    normalizedData.start_datetime = format(
      new Date(normalizedData.start_datetime),
      "yyyy-MM-dd HH:mm:ss",
    );
  }

  if (normalizedData.end_datetime) {
    normalizedData.end_datetime = format(
      new Date(normalizedData.end_datetime),
      "yyyy-MM-dd HH:mm:ss",
    );
  }

  return normalizedData;
};

const fileToBase64Content = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() || "" : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const getLocalReceiptFile = (attachment: any): File | null => {
  const file = attachment?.file || attachment;
  return file instanceof File ? file : null;
};

const getReceiptFileFingerprint = (file: File) =>
  [file.name, file.size, file.lastModified].join(":");

const isBlankExpenseValue = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
};

const AttachmentPreviewVanillaV2: React.FC<{
  currentAttachments: any[];
  onRemove: (index: number) => void;
  portalId?: string;
  compKey?: string;
  heading?: string;
}> = ({
  currentAttachments,
  onRemove,
  portalId,
  compKey,
  heading = "Attachments Preview",
}) => {
    const [previewFile, setPreviewFile] = useState<{
      url: string;
      name?: string;
    } | null>(null);

    useEffect(() => {
      const interval = window.setInterval(() => {
        let portal: Element | null = null;

        if (portalId) {
          portal = document.getElementById(portalId);
        } else if (compKey) {
          const wrapper = document.querySelector(`.formio-component-${compKey}`);
          if (wrapper) {
            let slot = wrapper.querySelector(`.custom-preview-${compKey}`);
            if (!slot) {
              slot = document.createElement("div");
              slot.className = `custom-preview-${compKey} mt-3 w-full`;
              wrapper.appendChild(slot);
            }
            portal = slot;
          }
        }

        if (!portal) return;

        const hash = currentAttachments
          .map((attachment) => {
            return (
              attachment?.url ||
              attachment?.file_url ||
              attachment?.originalName ||
              attachment?.name ||
              "file"
            );
          })
          .join("|");

        if (portal.getAttribute("data-hash") === hash && portal.children.length > 0) {
          return;
        }

        portal.setAttribute("data-hash", hash);

        if (currentAttachments.length === 0) {
          portal.innerHTML = "";
          return;
        }

        let html = '<div class="h-full px-2 lg:px-6">';
        html += `<h3 class="text-md font-medium mb-2 text-gray-800">${heading.replace(/"/g, "&quot;")}</h3>`;
        html += '<div class="space-y-2">';

        currentAttachments.forEach((attachment: any, index: number) => {
          let actualFile = attachment.file;
          if (
            actualFile &&
            !(actualFile instanceof Blob || actualFile instanceof File)
          ) {
            actualFile = null;
          }

          const url =
            attachment?.data?.message?.file_url ||
            attachment?.url ||
            attachment?.file_url;
          if (!actualFile && !url) return;

          let parsedUrl = url;
          if (
            url &&
            typeof url === "string" &&
            !url.startsWith("http") &&
            !url.startsWith("/") &&
            !url.startsWith("blob:")
          ) {
            parsedUrl = url.startsWith("files/") ? `/${url}` : `/files/${url}`;
          }

          const previewUrl = actualFile ? URL.createObjectURL(actualFile) : parsedUrl;
          const fileName =
            attachment?.originalName ||
            attachment?.name ||
            attachment?.data?.message?.file_name ||
            actualFile?.name ||
            "Attachment";
          const safeName = fileName.replace(/"/g, "&quot;");
          const isImage = actualFile
            ? actualFile.type?.startsWith("image/")
            : (
              (attachment?.type || attachment?.data?.message?.file_type)?.startsWith(
                "image/",
              ) ||
              /\.(jpeg|jpg|gif|png|webp|svg|ico)$/i.test(fileName)
            );

          html += '<div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg gap-3">';
          html += '<div class="flex items-center gap-3 min-w-0 flex-1">';

          if (isImage) {
            html += `<img src="${previewUrl}" alt="${safeName}" class="w-12 h-12 object-cover rounded-md border shrink-0" style="border-color: #d1d5db !important;" />`;
          } else {
            html += '<div class="w-12 h-12 flex items-center justify-center bg-white border rounded-md text-[10px] font-semibold text-gray-600 uppercase shrink-0" style="border-color: #d1d5db !important;">File</div>';
          }

          html += '<div class="min-w-0 flex-1">';
          html += `<p class="text-sm font-medium text-gray-900 truncate" title="${safeName}">${safeName}</p>`;
          html += '<p class="text-xs text-gray-500">Attachment</p>';
          html += "</div>";
          html += "</div>";

          html += '<div class="flex items-center gap-2 shrink-0">';
          html += `<button type="button" title="Preview" class="preview-file-btn-v2 inline-flex items-center justify-center rounded-md border shadow-sm border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100 transition-colors" data-preview-url="${previewUrl}" data-preview-name="${safeName}">${EYE_ICON_SVG}</button>`;
          html += `<a href="${previewUrl}" download="${safeName}" title="Download" class="inline-flex items-center justify-center rounded-md border shadow-sm border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100 transition-colors">${DOWNLOAD_ICON_SVG}</a>`;
          html += `<button type="button" title="Delete" class="remove-file-btn-v2 inline-flex items-center justify-center rounded-md border shadow-sm border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 transition-colors" data-index="${index}">${TRASH_ICON_SVG}</button>`;
          html += "</div>";
          html += "</div>";
        });

        html += "</div></div>";
        portal.innerHTML = html;

        const triggers = portal.querySelectorAll(".preview-file-btn-v2");
        triggers.forEach((element) => {
          element.addEventListener("click", () => {
            const fileUrl = element.getAttribute("data-preview-url");
            const fileName = element.getAttribute("data-preview-name") || undefined;

            if (fileUrl) {
              setPreviewFile({ url: fileUrl, name: fileName });
            }
          });
        });

        const removeButtons = portal.querySelectorAll(".remove-file-btn-v2");
        removeButtons.forEach((element) => {
          element.addEventListener("click", () => {
            const rawIndex = element.getAttribute("data-index");
            const index = rawIndex ? Number(rawIndex) : NaN;
            if (!Number.isNaN(index)) {
              onRemove(index);
            }
          });
        });
      }, 300);

      return () => {
        window.clearInterval(interval);
      };
    }, [compKey, currentAttachments, heading, onRemove, portalId]);

    return previewFile ? (
      <FilePreviewModal
        fileUrl={previewFile.url}
        fileName={previewFile.name}
        onClose={() => setPreviewFile(null)}
      />
    ) : null;
  };

const DEFAULT_CATEGORY_TYPE = "General";
const EYE_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
const DOWNLOAD_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>';
const TRASH_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

type ExistingAttachment = {
  name: string;
  size: number;
  url: string;
  file_url?: string;
  fileDocName?: string;
  storage: "url";
  originalName?: string;
  type?: string;
};

type AttachmentDocument = {
  name?: string;
  file_name?: string;
  file_url?: string;
};

type ParticipantLike = {
  amount?: unknown;
  allocated_amount?: unknown;
  [key: string]: unknown;
};

const getAttachmentIdentity = (attachment: any) => {
  const fileName =
    attachment?.fileDocName ||
    attachment?.originalName ||
    attachment?.name ||
    attachment?.data?.message?.file_name ||
    attachment?.file?.name ||
    "";
  const fileUrl =
    attachment?.url || attachment?.file_url || attachment?.data?.message?.file_url || "";

  return `${fileName}::${fileUrl}`;
};

const toAttachmentArray = (value: unknown): any[] =>
  Array.isArray(value) ? value : value ? [value] : [];

const normalizeAttachmentUrl = (value: unknown): string => {
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

const isPendingLocalAttachment = (attachment: any) => {
  const actualFile = attachment?.file;
  const hasLocalFile =
    actualFile instanceof Blob || actualFile instanceof File;

  return hasLocalFile && !attachment?.url && !attachment?.file_url;
};

const findMatchingAttachmentDocument = (
  attachments: AttachmentDocument[],
  attachment: any,
) => {
  const attachmentUrl = normalizeAttachmentUrl(
    attachment?.url || attachment?.file_url || attachment?.data?.message?.file_url,
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

const areAttachmentListsEqual = (left: any[], right: any[]) => {
  if (left.length !== right.length) return false;

  const leftIds = left.map(getAttachmentIdentity).sort();
  const rightIds = right.map(getAttachmentIdentity).sort();

  return leftIds.every((value, index) => value === rightIds[index]);
};

const dedupeAttachments = <T,>(attachments: T[]): T[] => {
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

const parseCustomFormData = (value: unknown): Record<string, unknown> => {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
};

const normalizeExistingAttachment = (value: unknown): ExistingAttachment | null => {
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

const mapClaimAttachments = (
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

const normalizeParticipantAmount = (
  participant: ParticipantLike,
): ParticipantLike => {
  if (participant.amount !== undefined && participant.amount !== null) {
    return participant;
  }

  if (
    participant.allocated_amount === undefined ||
    participant.allocated_amount === null
  ) {
    return participant;
  }

  return {
    ...participant,
    amount:
      typeof participant.allocated_amount === "number"
        ? participant.allocated_amount
        : Number(participant.allocated_amount),
  };
};

const buildInitialDynamicFormData = (
  expense?: ExpenseNavigationExpense | null,
): Record<string, any> => {
  if (!expense) return {};

  const customFormData = parseCustomFormData(expense.custom_form_data);
  const nextData: Record<string, any> = {
    ...customFormData,
    ...expense,
  };

  delete nextData.custom_form_data;

  const categoryType =
    typeof nextData.category_type === "string" && nextData.category_type
      ? nextData.category_type
      : typeof nextData.categoryType === "string" && nextData.categoryType
        ? nextData.categoryType
        : DEFAULT_CATEGORY_TYPE;

  nextData.category_type = categoryType;
  nextData.categoryType = categoryType;

  const rawAttachments = Array.isArray(nextData.attach_receipt)
    ? nextData.attach_receipt
    : nextData.attach_receipt
      ? [nextData.attach_receipt]
      : Array.isArray(nextData.attachments)
        ? nextData.attachments
        : nextData.attachments
          ? [nextData.attachments]
          : nextData.custom_attach_receipt
            ? [nextData.custom_attach_receipt]
            : [];

  const normalizedAttachments = rawAttachments
    .map(normalizeExistingAttachment)
    .filter((item): item is ExistingAttachment => item !== null);

  if (normalizedAttachments.length > 0) {
    nextData.attach_receipt = dedupeAttachments(normalizedAttachments);
  }

  if (Array.isArray(nextData.participants) && nextData.participants.length > 0) {
    nextData.participants = nextData.participants.map((participant: unknown) =>
      participant && typeof participant === "object"
        ? normalizeParticipantAmount(participant as ParticipantLike)
        : participant,
    );
    nextData.shareExpenseCheckbox = true;
  }

  return normalizeExpensePayloadData(nextData);
};

export interface AddExpenseFormV2Props {
  initialExpense?: ExpenseNavigationExpense | null;
  expense_claim_name?: string | null;
  draft_document_name?: string | null;
  isEditingFromDetailsPage?: boolean;
  isResubmit?: boolean;
}

const AddExpenseFormV2: React.FC<AddExpenseFormV2Props> = ({
  initialExpense,
  expense_claim_name,
  draft_document_name,
  isEditingFromDetailsPage,
}) => {
  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    fields: ["name", "employee_name", "company"],
  });
  const hydrationRef = useRef(Boolean(initialExpense));
  const attachmentHydrationRef = useRef(false);
  const processedReceiptFilesRef = useRef<Set<string>>(new Set());
  const isEditingExistingExpense = Boolean(
    initialExpense &&
    (expense_claim_name || draft_document_name || isEditingFromDetailsPage),
  );
  const isDraftExpenseEdit = Boolean(
    draft_document_name || initialExpense?.approval_status === "Draft",
  );
  const linkedDocumentName = draft_document_name || expense_claim_name || undefined;
  const linkedDocumentType = draft_document_name
    ? "Draft Expense Claim"
    : "Expense Claim";

  const [selectedExpenseType, setSelectedExpenseType] = useState<string>("");
  const [mainFormData, setMainFormData] = useState<Record<string, any>>({});
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>(
    {},
  );
  const [dynamicFormRevision, setDynamicFormRevision] = useState(0);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [isDeleteShareConfirmOpen, setIsDeleteShareConfirmOpen] =
    useState(false);
  const [isAcknowledgementOpen, setIsAcknowledgementOpen] = useState(false);
  const [isAcknowledgementChecked, setIsAcknowledgementChecked] =
    useState(false);
  const [
    isRelocationAcknowledgementChecked,
    setIsRelocationAcknowledgementChecked,
  ] = useState(false);
  const [pendingSubmissionType, setPendingSubmissionType] = useState<
    "General" | "Relocation" | null
  >(null);
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const loading = useLoadingOverlay();

  const mainSubmission = useMemo(
    () => {
      const nextData = { ...mainFormData };

      if (!nextData.employee) {
        nextData.employee = currentEmployee?.name || "";
      }

      if (!nextData.category_type) {
        nextData.category_type = DEFAULT_CATEGORY_TYPE;
      }

      return { data: nextData };
    },
    [currentEmployee?.name, mainFormData],
  );

  const { data: expenseTypeFieldsData, isFetching: isFetchingExpenseFields } =
    useGetExpenseTypeFields(selectedExpenseType);
  const {
    data: claimAttachments,
    isFetched: hasFetchedClaimAttachments,
    refetch: refetchClaimAttachments,
  } = useGetExpenseAttachments(linkedDocumentName, linkedDocumentType);
  const { mutateAsync: validateExpense } = useValidateExpense();
  const { mutateAsync: submitExpenseClaim } = usePostExpenseClaim();
  const { mutateAsync: updateExpenseClaim } = useUpdateExpense();
  const { mutateAsync: deleteExpenseAttachment } = useDeleteExpenseAttachment();
  const { mutateAsync: updateFileLink } = useUpdateFileAttachment();
  const { uploadFiles } = useFileUploader();
  const claimAttachmentDocuments = useMemo(
    () =>
      Array.isArray(claimAttachments)
        ? (claimAttachments as AttachmentDocument[])
        : [],
    [claimAttachments],
  );

  const expenseTypePayload = useMemo(
    () =>
      expenseTypeFieldsData?.message &&
        typeof expenseTypeFieldsData.message === "object"
        ? expenseTypeFieldsData.message
        : expenseTypeFieldsData || {},
    [expenseTypeFieldsData],
  );

  const claimTypeBasedOn = expenseTypePayload?.claim_type_based_on;
  const isAmountReadonly = !!expenseTypePayload?.is_amount_readonly;
  const isShareAllowed = Boolean(expenseTypePayload?.shared_expense_allowed);
  const maxAllowedParticipants =
    Number(expenseTypePayload?.shared_expense_limit) || 5;
  const isAttachmentMandatory = useMemo(() => {
    const fields = expenseTypePayload?.fields;
    if (!Array.isArray(fields)) return false;
    return fields.some(
      (f: any) =>
        f?.fieldname === "attach_receipt" &&
        (f?.required === true || f?.required === 1),
    );
  }, [expenseTypePayload]);
  const hasAttachReceiptField = useMemo(() => {
    const fields = expenseTypePayload?.fields;
    if (!Array.isArray(fields)) return false;
    return fields.some((f: any) => f?.fieldname === "attach_receipt");
  }, [expenseTypePayload]);
  const displayParticipants = useMemo(
    () =>
      Array.isArray(dynamicFormData?.participants)
        ? dynamicFormData.participants
        : [],
    [dynamicFormData?.participants],
  );

  const customFileComponents = useMemo(() => {
    const customData = expenseTypePayload?.custom_form_data;
    if (!customData) return [];
    try {
      const parsed =
        typeof customData === "string" ? JSON.parse(customData) : customData;
      if (!parsed || !Array.isArray(parsed.components)) return [];

      const findFiles = (comps: any[]): any[] => {
        let files: any[] = [];
        comps.forEach((c) => {
          if (c.type === "file") files.push(c);
          if (Array.isArray(c.components))
            files = [...files, ...findFiles(c.components)];
          if (Array.isArray(c.columns)) {
            c.columns.forEach((col: any) => {
              if (Array.isArray(col.components))
                files = [...files, ...findFiles(col.components)];
            });
          }
        });
        return files;
      };

      return findFiles(parsed.components);
    } catch (e) {
      console.error("Failed to parse custom_form_data for file search", e);
      return [];
    }
  }, [expenseTypePayload?.custom_form_data]);

  const customFileKeys = useMemo(() => {
    return customFileComponents.map((c: any) => c.key);
  }, [customFileComponents]);

  const hiddenFileListKeys = useMemo(() => {
    const keys = customFileComponents.map((comp: any) => String(comp.key));
    if (hasAttachReceiptField) {
      keys.push("attach_receipt");
    }
    return Array.from(new Set(keys));
  }, [customFileComponents, hasAttachReceiptField]);

  const extractCustomFiles = useCallback(() => {
    const filesToUpload: any[] = [];
    const fileKeyMap: Record<number, { key: string; index: number }> = {};

    customFileKeys.forEach((key) => {
      const val = dynamicFormData[key];
      const files = Array.isArray(val) ? val : val ? [val] : [];
      files.forEach((f: any, idx: number) => {
        if (f && f.file && !f.url && !f.file_url) {
          fileKeyMap[filesToUpload.length] = { key, index: idx };
          filesToUpload.push(f);
        }
      });
    });

    return { filesToUpload, fileKeyMap };
  }, [customFileKeys, dynamicFormData]);

  const applyUploadedCustomFileUrls = (
    currentDynamicData: Record<string, any>,
    uploadResults: any[],
    fileKeyMap: Record<number, { key: string; index: number }>,
  ) => {
    const nextData = { ...currentDynamicData };
    uploadResults.forEach((res, i) => {
      if (!res) return;
      const mapInfo = fileKeyMap[i];
      if (!mapInfo) return;
      const { key, index } = mapInfo;
      const val = nextData[key];
      const files = Array.isArray(val) ? [...val] : [val];

      if (files[index]) {
        files[index] = {
          ...files[index],
          name: res.file_name || files[index].name,
          originalName: files[index].name || res.file_name,
          size: res.file_size || files[index].size,
          type: res.file_type || files[index].type,
          url: res.file_url,
          file_url: res.file_url,
          storage: "url",
        };
      }

      nextData[key] = Array.isArray(val) ? files : files[0];
    });
    return nextData;
  };

  const removeFormioFile = async (compKey: string, index: number) => {
    const currentValue = dynamicFormData?.[compKey];
    const currentFiles = toAttachmentArray(currentValue);
    const targetAttachment = currentFiles[index];
    const isArrayField = Array.isArray(currentValue);
    const nextFiles = currentFiles.filter((_: any, i: number) => i !== index);

    const nextFieldValue =
      isArrayField || currentValue === undefined
        ? nextFiles
        : (nextFiles[0] ?? []);

    try {
      const container = document.querySelector(`.formio-component-${compKey}`);
      if (container) {
        const removeButtons = container.querySelectorAll(
          'i[ref="fileStatusRemove"], i[ref="removeLink"], button[ref="removeLink"], i.fa-times'
        );
        if (removeButtons && removeButtons[index]) {
          (removeButtons[index] as HTMLElement).click();
        } else {
          console.error("Form.io native remove button not found");
        }
      }

      setDynamicFormData((prev) => ({
        ...prev,
        [compKey]: nextFieldValue,
      }));

      if (
        !targetAttachment ||
        !linkedDocumentName ||
        isPendingLocalAttachment(targetAttachment)
      ) {
        return;
      }

      const matchingDocument = findMatchingAttachmentDocument(
        claimAttachmentDocuments,
        targetAttachment,
      );

      if (!matchingDocument?.name) {
        return;
      }

      await deleteExpenseAttachment(matchingDocument.name);
      attachmentHydrationRef.current = false;
      await refetchClaimAttachments();
    } catch (err) {
      console.error("Failed to remove file from formio", err);
      setDynamicFormData((prev) => ({
        ...prev,
        [compKey]: isArrayField ? currentFiles : (currentFiles[0] ?? []),
      }));
    }
  };

  const applyReceiptExtraction = useCallback(
    (fields: Record<string, any>) => {
      if (!fields || typeof fields !== "object") return false;

      const hasUsableFields = [
        "expense_date",
        "amount",
        "description",
        "invoice_number",
        "merchant",
        "currency",
      ].some((key) => !isBlankExpenseValue(fields[key]));

      setDynamicFormData((prev) => {
        const nextData = { ...prev };
        let didApply = false;
        const fillIfBlank = (key: string, value: unknown) => {
          if (isBlankExpenseValue(value)) return;
          if (!isBlankExpenseValue(nextData[key])) return;
          nextData[key] = value;
          didApply = true;
        };

        fillIfBlank("expense_date", fields.expense_date);
        fillIfBlank("amount", fields.amount);
        fillIfBlank("description", fields.description);
        fillIfBlank("invoice_number", fields.invoice_number);
        fillIfBlank("merchant", fields.merchant);

        if (
          !isBlankExpenseValue(fields.currency) &&
          (isBlankExpenseValue(nextData.currency) ||
            (String(nextData.currency).toUpperCase() === "INR" &&
              String(fields.currency).toUpperCase() !== "INR"))
        ) {
          nextData.currency = fields.currency;
          didApply = true;
        }

        return didApply ? normalizeExpensePayloadData(nextData) : prev;
      });

      if (hasUsableFields) {
        setDynamicFormRevision((revision) => revision + 1);
      }

      return hasUsableFields;
    },
    [],
  );

  const extractReceiptFromAttachments = useCallback(
    async (attachments: any[], latestDynamicData: Record<string, any>) => {
      const targetFile = toAttachmentArray(attachments)
        .map(getLocalReceiptFile)
        .find((file): file is File => Boolean(file));

      if (!targetFile) return;

      const fingerprint = getReceiptFileFingerprint(targetFile);
      if (processedReceiptFilesRef.current.has(fingerprint)) return;
      processedReceiptFilesRef.current.add(fingerprint);

      const toastId = toast.loading("Reading receipt...");

      try {
        const content = await fileToBase64Content(targetFile);
        const response = (await FrappeAPI.callMethod(
          "chatnext_expense_trips.document_extraction.api.extract_receipt_fields_from_base64",
          {
            file_name: targetFile.name,
            content,
            expense_category:
              mainFormData?.expenseCategory ||
              latestDynamicData?.expenseCategory ||
              "",
            expense_type:
              mainFormData?.expenseType || latestDynamicData?.expenseType || "",
          },
        )) as Record<string, any>;

        const fields =
          response && typeof response === "object" && "fields" in response
            ? (response.fields as Record<string, any>)
            : {};

        if (applyReceiptExtraction(fields)) {
          toast.success("Receipt details filled. Please review before saving.", {
            id: toastId,
          });
        } else {
          toast("Receipt uploaded. I could not find new fields to fill.", {
            id: toastId,
          });
        }
      } catch (error) {
        processedReceiptFilesRef.current.delete(fingerprint);
        console.error("Receipt extraction failed", error);
        toast.error("Could not read this receipt. You can still enter it manually.", {
          id: toastId,
        });
      }
    },
    [applyReceiptExtraction, mainFormData?.expenseCategory, mainFormData?.expenseType],
  );

  const { data: employeesList, isFetching: isLoadingEmployees } = useEmployees([
    "name",
    "employee_name",
  ]);

  const vehicleType =
    typeof dynamicFormData?.vehicle_type === "string"
      ? dynamicFormData.vehicle_type
      : dynamicFormData?.vehicle_type?.name || "";

  const rawUnits = dynamicFormData?.units ?? dynamicFormData?.no_of_units;
  const unitsValue =
    rawUnits !== undefined && rawUnits !== null && rawUnits !== ""
      ? Number(rawUnits)
      : undefined;
  const hasValidUnits =
    unitsValue !== undefined && Number.isFinite(unitsValue) && unitsValue >= 0;

  const shouldCalculateAmount =
    !!selectedExpenseType &&
    hasValidUnits &&
    (claimTypeBasedOn !== "Per Mileage" || !!vehicleType);

  const calcParams = useMemo(
    () =>
      shouldCalculateAmount
        ? {
          expense_type: selectedExpenseType,
          units: Number(unitsValue),
          vehicle_type: vehicleType || undefined,
        }
        : undefined,
    [shouldCalculateAmount, selectedExpenseType, unitsValue, vehicleType],
  );

  const { data: calculatedAmountData } = useCalculateExpenseAmount(calcParams);

  const { data: unitPriceData } = useGetUnitPrice(
    selectedExpenseType || undefined,
    vehicleType || undefined,
  );

  const unitFieldLabel = useMemo(() => {
    // Primary: handle direct string returned by callMethod (response.data.message)
    if (typeof unitPriceData === "string" && unitPriceData.trim()) {
      return unitPriceData;
    }

    // Secondary: handle object payload variants safely
    if (
      unitPriceData &&
      typeof unitPriceData === "object" &&
      "message" in unitPriceData
    ) {
      if (typeof unitPriceData.message === "string") {
        return unitPriceData.message;
      }

      if (
        unitPriceData.message &&
        typeof unitPriceData.message === "object" &&
        "label" in unitPriceData.message
      ) {
        return String(unitPriceData.message.label || "");
      }
    }

    // Fallback: API field label from get_expense_type_fields payload
    const unitsField = Array.isArray(expenseTypePayload?.fields)
      ? expenseTypePayload.fields.find(
        (field: any) =>
          field?.fieldname === "units" || field?.fieldname === "no_of_units",
      )
      : null;

    // Final fallback
    return unitsField?.label || "Units";
  }, [unitPriceData, expenseTypePayload]);

  useEffect(() => {
    if (!initialExpense || !hydrationRef.current) return;

    const nextDynamicData = buildInitialDynamicFormData(initialExpense);
    const nextExpenseTypeRaw =
      nextDynamicData.expenseType || nextDynamicData.expense_type;
    const nextExpenseType =
      typeof nextExpenseTypeRaw === "string" ? nextExpenseTypeRaw : "";
    const nextCategoryTypeRaw =
      nextDynamicData.category_type || nextDynamicData.categoryType;
    const nextCategoryType =
      typeof nextCategoryTypeRaw === "string" && nextCategoryTypeRaw
        ? nextCategoryTypeRaw
        : DEFAULT_CATEGORY_TYPE;

    setDynamicFormData(nextDynamicData);
    setMainFormData({
      employee: currentEmployee?.name || "",
      category_type: nextCategoryType,
      expenseCategory:
        typeof nextDynamicData.expenseCategory === "string"
          ? nextDynamicData.expenseCategory
          : "",
      expenseType: nextExpenseType,
    });
    setSelectedExpenseType(nextExpenseType);
    hydrationRef.current = false;
  }, [currentEmployee?.name, initialExpense]);

  useEffect(() => {
    if (!linkedDocumentName || !hasFetchedClaimAttachments) return;

    const nextAttachments = mapClaimAttachments(claimAttachmentDocuments);

    setDynamicFormData((prev) => {
      let changed = !attachmentHydrationRef.current;
      const nextData = { ...prev };

      const existingAttachments = toAttachmentArray(prev.attach_receipt);
      const pendingReceiptAttachments = existingAttachments.filter(
        isPendingLocalAttachment,
      );
      const mergedReceiptAttachments = dedupeAttachments([
        ...nextAttachments,
        ...pendingReceiptAttachments,
      ]);

      if (
        !areAttachmentListsEqual(existingAttachments, mergedReceiptAttachments)
      ) {
        nextData.attach_receipt = mergedReceiptAttachments;
        changed = true;
      }

      customFileKeys.forEach((key) => {
        const currentFiles = toAttachmentArray(prev[key]);
        if (currentFiles.length === 0) return;

        const filteredFiles = currentFiles.filter((file) => {
          if (isPendingLocalAttachment(file)) {
            return true;
          }

          return Boolean(
            findMatchingAttachmentDocument(claimAttachmentDocuments, file),
          );
        });

        if (!areAttachmentListsEqual(currentFiles, filteredFiles)) {
          nextData[key] = Array.isArray(prev[key])
            ? filteredFiles
            : (filteredFiles[0] ?? []);
          changed = true;
        }
      });

      attachmentHydrationRef.current = true;
      return changed ? nextData : prev;
    });
  }, [
    claimAttachmentDocuments,
    customFileKeys,
    hasFetchedClaimAttachments,
    linkedDocumentName,
  ]);

  useEffect(() => {
    if (hydrationRef.current || isEditingExistingExpense) return;

    if (!selectedExpenseType) {
      setMainFormData({});
      setDynamicFormData({});
      setIsSharePanelOpen(false);
    }
  }, [isEditingExistingExpense, selectedExpenseType]);

  useEffect(() => {
    if (isSharePanelOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSharePanelOpen]);

  const calculatedAmount = useMemo(() => {
    const rawAmount =
      calculatedAmountData &&
        typeof calculatedAmountData === "object" &&
        "amount" in calculatedAmountData
        ? (calculatedAmountData as any).amount
        : (calculatedAmountData as any)?.message?.amount;
    const numeric = Number(rawAmount);
    return Number.isFinite(numeric) ? numeric : null;
  }, [calculatedAmountData]);

  useEffect(() => {
    if (calculatedAmount === null) return;

    setDynamicFormData((prev) => {
      if (prev?.amount === calculatedAmount) return prev;
      return {
        ...prev,
        amount: calculatedAmount,
      };
    });
  }, [calculatedAmount]);

  const dynamicSchema = useMemo(
    () =>
      buildExpenseTypeDynamicSchema(expenseTypeFieldsData, {
        employeeName: currentEmployee?.name || "",
        expenseType: selectedExpenseType,
        isAmountReadonly,
        unitFieldLabel,
      }),
    [
      expenseTypeFieldsData,
      currentEmployee?.name,
      selectedExpenseType,
      isAmountReadonly,
      unitFieldLabel,
    ],
  );

  const dynamicFormRenderKey = useMemo(
    () => `${selectedExpenseType || "no-expense-type"}-${dynamicFormRevision}`,
    [selectedExpenseType, dynamicFormRevision],
  );

  const dynamicSubmission = useMemo(
    () => ({
      data: {
        ...buildInitialDynamicFormData(initialExpense),
        ...dynamicFormData,
      },
    }),
    [initialExpense, dynamicFormData],
  );

  const currentAttachments = useMemo(() => {
    const raw = dynamicFormData?.attach_receipt;
    if (Array.isArray(raw)) return [...raw];
    return raw ? [raw] : [];
  }, [dynamicFormData]);

  const customFormFileUrls = useMemo(() => {
    const urls: string[] = [];
    customFileKeys.forEach((key) => {
      const val = dynamicFormData[key];
      const files = Array.isArray(val) ? val : val ? [val] : [];
      files.forEach((f: any) => {
        const url = f?.url || f?.file_url;
        if (url) urls.push(url);
      });
    });
    return new Set(urls);
  }, [dynamicFormData, customFileKeys]);

  const visibleAttachments = useMemo(
    () =>
      dedupeAttachments(
        currentAttachments.filter((item: any) => {
          if (item?.deleted === true) return false;
          if (item?.remove === true) return false;
          if (
            typeof item?.status === "string" &&
            item.status.toLowerCase().includes("remove")
          ) {
            return false;
          }
          const itemUrl = item?.url || item?.file_url;
          if (itemUrl && customFormFileUrls.has(itemUrl)) return false;
          return true;
        }),
      ),
    [currentAttachments, customFormFileUrls],
  );

  const hasFileFieldDelta = useCallback(
    (nextData: Record<string, any>) => {
      const watchedKeys = new Set<string>(["attach_receipt", ...customFileKeys]);

      for (const key of watchedKeys) {
        if (
          !areAttachmentListsEqual(
            toAttachmentArray(dynamicFormData?.[key]),
            toAttachmentArray(nextData?.[key]),
          )
        ) {
          return true;
        }
      }

      return false;
    },
    [customFileKeys, dynamicFormData],
  );

  const buildCombinedData = () => {
    return normalizeExpensePayloadData({ ...mainFormData, ...dynamicFormData });
  };

  const buildExpenseRecord = (
    combinedData: Record<string, any>,
    forSubmit: boolean,
  ) => {
    const record: Record<string, any> = {
      ...combinedData,
      expense_type: combinedData.expenseType,
      reimbursement_category: combinedData.expenseCategory,
      categoryType: combinedData.category_type || "General",
      custom_expense_category_name: combinedData.expenseCategory,
      custom_expense_type: combinedData.expenseType,
      amount: combinedData.amount,
    };

    // Format attachments as a comma-separated string of filenames
    const files = Array.isArray(combinedData.attach_receipt)
      ? combinedData.attach_receipt
      : combinedData.attach_receipt
        ? [combinedData.attach_receipt]
        : [];

    if (files.length > 0) {
      record.attachments = files
        .map((f: any) => f.name || f.originalName || "file")
        .join(", ");
    } else {
      record.attachments = "";
    }

    // Remove unwanted keys as requested
    delete record.uid;
    delete record.categoryTypeOptions;
    delete record.submitButton;
    delete record.saveAndSubmit;
    delete record.attach_receipt; // Remove the original array/object

    // Keep original keys for V1 compatibility if needed, but buildExpenseRecord usually maps them
    // The user's example shows expenseCategory and expenseType are still there.
    // record.expense_type and record.reimbursement_category are also added above.

    if (forSubmit) {
      record.custom_is_acknowledged = isAcknowledgementChecked;
      if ((combinedData.category_type || "General") === "Relocation") {
        record.custom_is_last_relocation_expense =
          isRelocationAcknowledgementChecked;
      }
    }

    // Handle custom_form_data extraction - only include fields from the expense type's custom form schema
    const customFormDataObj: Record<string, any> = {};

    if (expenseTypePayload?.custom_form_data) {
      try {
        const parsedCustomForm =
          typeof expenseTypePayload.custom_form_data === "string"
            ? JSON.parse(expenseTypePayload.custom_form_data)
            : expenseTypePayload.custom_form_data;

        const extractFieldKeys = (components: any[]): string[] => {
          const keys: string[] = [];
          if (!Array.isArray(components)) return keys;
          components.forEach((comp: any) => {
            if (comp?.key) keys.push(comp.key);
            if (Array.isArray(comp?.components))
              keys.push(...extractFieldKeys(comp.components));
            if (Array.isArray(comp?.columns)) {
              comp.columns.forEach((col: any) => {
                if (Array.isArray(col?.components))
                  keys.push(...extractFieldKeys(col.components));
              });
            }
          });
          return keys;
        };

        const customFormFieldKeys = extractFieldKeys(parsedCustomForm?.components || []);

        customFormFieldKeys.forEach((key) => {
          if (combinedData[key] !== undefined) {
            customFormDataObj[key] = combinedData[key];
            delete record[key];
          }
        });

        if (Object.keys(customFormDataObj).length > 0) {
          record.custom_form_data = JSON.stringify(customFormDataObj);
        }
      } catch (e) {
        console.error("Failed to parse custom_form_data schema", e);
      }
    }

    // Clean up file objects
    Object.keys(record).forEach((key) => {
      const val = record[key];
      if (
        Array.isArray(val) &&
        val.some(
          (item: any) =>
            item?.storage === "customfiles" || item?.storage === "base64",
        )
      ) {
        record[key] = "";
      }
    });

    return record;
  };

  const submitValidation = async (combinedData: Record<string, any>) => {
    const validationPayload: Record<string, unknown> = {
      employee: currentEmployee?.name,
      employee_name: currentEmployee?.employee_name,
      company: currentEmployee?.company,
      posting_date: format(new Date(), "yyyy-MM-dd"),
      expenses: [buildExpenseRecord(combinedData, true)],
    };

    if (draft_document_name) {
      validationPayload.expense_claim_name = draft_document_name;
    } else if (expense_claim_name) {
      validationPayload.expense_claim_name = expense_claim_name;
    }

    await validateExpense(JSON.stringify(validationPayload));
  };

  const submitExpenseFlow = async ({
    forSubmit,
    approvalStatus,
    onSuccess,
  }: {
    forSubmit: boolean;
    approvalStatus?: string;
    onSuccess?: () => void;
  }) => {
    try {
      const combinedDataBeforeUpload = buildCombinedData();
      const pendingReceiptUploads = currentAttachments.filter(
        (attachment: any) =>
          Boolean(attachment?.file) && !attachment?.url && !attachment?.file_url,
      );
      if (
        !combinedDataBeforeUpload.expenseCategory ||
        !combinedDataBeforeUpload.expenseType
      ) {
        toast.error("Please select Expense Category and Expense Type!");
        return;
      }
      if (isAttachmentMandatory && currentAttachments.length === 0 && forSubmit) {
        toast.error("Please attach a receipt to proceed.");
        return;
      }

      loading.show("Saving Expense...");

      if (forSubmit) {
        await submitValidation(combinedDataBeforeUpload);
      }

      const { filesToUpload, fileKeyMap } = extractCustomFiles();
      let finalDynamicData = dynamicFormData;
      let customUploadResults: any[] = [];
      const customFileLinkDoctype = isEditingExistingExpense
        ? linkedDocumentType
        : undefined;
      const customFileLinkDocName = isEditingExistingExpense
        ? linkedDocumentName
        : undefined;

      // 2. Upload custom files first so their final URLs can be part of the claim payload.
      if (filesToUpload.length > 0) {
        customUploadResults = await uploadFiles(
          filesToUpload,
          customFileLinkDoctype,
          customFileLinkDocName,
        );
        finalDynamicData = applyUploadedCustomFileUrls(
          dynamicFormData,
          customUploadResults,
          fileKeyMap,
        );
      }

      const finalCombinedData = normalizeExpensePayloadData({
        ...combinedDataBeforeUpload,
        ...finalDynamicData,
      });
      const expenseRecord = buildExpenseRecord(finalCombinedData, forSubmit);

      if (isEditingExistingExpense && (expense_claim_name || draft_document_name)) {
        const documentName = (draft_document_name || expense_claim_name) as string;

        const originalParticipants = (initialExpense?.participants as any[]) || [];

        const activeParticipants = Array.isArray(dynamicFormData?.participants)
          ? dynamicFormData.participants.filter((p: any) => !!p.employee || !!p.guest_name)
          : [];

        const activeMapped = activeParticipants.map((p: any) => {
          const match = originalParticipants.find((orig: any) => {
            if (p.employee_type === "Guest") {
              return orig.employee_type === "Guest" && orig.guest_name === p.guest_name;
            }
            return orig.employee_type !== "Guest" && orig.employee === p.employee;
          });

          const dbName = match?.name || p.name;

          return {
            name: dbName,
            employee_type: p.employee_type,
            employee: p.employee,
            employee_name: p.employee_name,
            guest_name: p.guest_name,
            percentage: p.percentage !== undefined && p.percentage !== null ? Number(p.percentage) : undefined,
          };
        });

        const participantsData = dynamicFormData?.shareExpenseCheckbox
          ? activeMapped
          : [];

        const updatePayload = isDraftExpenseEdit
          ? {
            expense_claim_name: documentName,
            expenses: [expenseRecord],
            isResubmit: false,
            ...(forSubmit ? { approval_status: "Pending" } : {}),
            participants: participantsData,
          }
          : {
            expense_claim_name: documentName,
            expenses: [expenseRecord],
            isResubmit: true,
            participants: participantsData,
          };

        await updateExpenseClaim({
          ...updatePayload,
        });

        if (pendingReceiptUploads.length > 0) {
          await uploadFiles(
            pendingReceiptUploads,
            linkedDocumentType,
            documentName,
          );
        }

        onSuccess?.();
        navigate("/webapp/expenses-app/expenses-list", {
          state: { refresh: true },
        });
        return;
      }

      // 3. Submit the actual expense claim payload.
      const submitPayload: any = {
        employee: currentEmployee?.name,
        employee_name: currentEmployee?.employee_name,
        company: currentEmployee?.company,
        posting_date: format(new Date(), "yyyy-MM-dd"),
        expenses: [expenseRecord],
      };

      if (approvalStatus) {
        submitPayload.approval_status = approvalStatus;
      }

      const response: any = await submitExpenseClaim(
        JSON.stringify(submitPayload),
      );
      const claimName =
        response?.claims?.[0]?.name ||
        (typeof response?.message === "string" ? response.message : null);

      if (claimName) {
        // 4. Upload standard receipts after the claim exists so they are linked correctly.
        if (pendingReceiptUploads.length > 0) {
          await uploadFiles(pendingReceiptUploads, "Expense Claim", claimName);
        }

        // 5. Link uploaded custom files back to the created claim.
        if (customUploadResults.length > 0) {
          for (const res of customUploadResults) {
            if (res && (res.name || res.file_name)) {
              await updateFileLink({
                fileName: res.name || res.file_name,
                data: {
                  attached_to_doctype: "Expense Claim",
                  attached_to_name: claimName,
                },
              });
            }
          }
        }
      }

      onSuccess?.();
      navigate("/webapp/expenses-app/expenses-list", {
        state: { refresh: true, initialFilter: approvalStatus ? "Pending" : "Draft" },
      });
    } catch (error) {
      console.error("Expense submission flow failed:", error);
    } finally {
      loading.hide();
    }
  };

  const handleSave = async () => {
    await submitExpenseFlow({
      forSubmit: false,
    });
  };

  const handleUpdate = async () => {
    await submitExpenseFlow({
      forSubmit: false,
    });
  };

  const handleSaveAndSubmitClick = () => {
    const categoryType = (mainFormData?.category_type || "General") as
      | "General"
      | "Relocation";
    setPendingSubmissionType(categoryType);
    setIsAcknowledgementChecked(false);
    setIsRelocationAcknowledgementChecked(false);
    setIsAcknowledgementOpen(true);
  };

  const handleProceedSubmit = async () => {
    if (!isAcknowledgementChecked) {
      toast.error("Please acknowledge the terms to proceed.");
      return;
    }

    await submitExpenseFlow({
      forSubmit: true,
      approvalStatus: "Pending",
      onSuccess: () => setIsAcknowledgementOpen(false),
    });
  };

  const FormContent = (
    <div className="flex flex-col h-full bg-white">
      <HeaderBar
        title={isEditingExistingExpense ? "Edit Expense" : "Add Expense"}
        onBack={() => navigate(-1)}
      />
      <div className="flex-1 overflow-y-auto p-4 pb-10">
        <Form
          form={expenseSchema}
          submission={mainSubmission}
          className="show-req-astrik"
          onChange={(change: any) => {
            const nextData = change?.data || {};
            const changedKey = change?.changed?.component?.key;
            const rawExpenseType = change?.data?.expenseType;
            const nextExpenseType =
              typeof rawExpenseType === "string"
                ? rawExpenseType
                : rawExpenseType?.name || rawExpenseType?.value || "";
            const nextExpenseCategory =
              typeof nextData.expenseCategory === "string"
                ? nextData.expenseCategory
                : nextData.expenseCategory?.name ||
                nextData.expenseCategory?.value ||
                "";

            const isTransientHydrationEvent =
              isEditingExistingExpense &&
              !changedKey &&
              (!nextExpenseType || !nextExpenseCategory);

            if (isTransientHydrationEvent) {
              return;
            }

            setMainFormData(nextData);

            if (
              changedKey &&
              (changedKey === "category_type" || changedKey === "expenseCategory")
            ) {
              setDynamicFormData({});
              setIsSharePanelOpen(false);
            }

            setSelectedExpenseType((prev) => {
              if (!nextExpenseType && isEditingExistingExpense && !changedKey) {
                return prev;
              }

              return prev === nextExpenseType ? prev : nextExpenseType;
            });
          }}
        />

        {selectedExpenseType && (
          <div style={{ marginTop: "1rem" }}>
            {isFetchingExpenseFields ? (
              <ExpenseFieldSkeleton />
            ) : (
              <>
                {hiddenFileListKeys.length > 0 && (
                  <style>{`
                  ${hiddenFileListKeys
                      .map(
                        (key) =>
                          `.formio-component-${key} .list-group { display: none !important; }`,
                      )
                      .join("\n")}
                `}</style>
                )}
                <Form
                  key={dynamicFormRenderKey}
                  form={dynamicSchema}
                  submission={dynamicSubmission}
                  className="show-req-astrik"
                  onChange={(change: any) => {
                    const changedKey = change?.changed?.component?.key;
                    const nextData = change?.data || {};
                    const receiptAttachments = toAttachmentArray(
                      nextData?.attach_receipt,
                    );

                    if (!changedKey) {
                      if (hasFileFieldDelta(nextData)) {
                        setDynamicFormData({ ...nextData });
                        if (
                          !areAttachmentListsEqual(
                            toAttachmentArray(dynamicFormData?.attach_receipt),
                            receiptAttachments,
                          )
                        ) {
                          void extractReceiptFromAttachments(
                            receiptAttachments,
                            nextData,
                          );
                        }
                      }
                      return;
                    }

                    if (changedKey === "attach_receipt") {
                      void extractReceiptFromAttachments(
                        receiptAttachments,
                        nextData,
                      );
                    }

                    if (
                      changedKey === "shareExpenseCheckbox" &&
                      isShareAllowed
                    ) {
                      const isChecked = Boolean(nextData?.shareExpenseCheckbox);
                      const hasExistingParticipants =
                        Array.isArray(nextData?.participants) &&
                        nextData.participants.length > 0;

                      if (
                        isEditingExistingExpense &&
                        isChecked &&
                        hasExistingParticipants
                      ) {
                        setDynamicFormData({ ...nextData });
                        return;
                      }

                      const currentAmount = Number(nextData?.amount ?? 0);

                      if (isChecked && !(currentAmount > 0)) {
                        toast.error(
                          "Please enter an amount before sharing the expense.",
                        );
                        setDynamicFormData({
                          ...nextData,
                          shareExpenseCheckbox: false,
                        });
                        setIsSharePanelOpen(false);
                        return;
                      }

                      if (
                        !isChecked &&
                        Array.isArray(nextData?.participants) &&
                        nextData.participants.length > 0
                      ) {
                        setDynamicFormData({
                          ...nextData,
                          shareExpenseCheckbox: true,
                        });
                        setIsDeleteShareConfirmOpen(true);
                        return;
                      }

                      setIsSharePanelOpen(isChecked);
                    }

                    setDynamicFormData({ ...nextData });
                  }}
                />

              </>
            )}

          </div>
        )}

        {displayParticipants.length > 0 && (
          <div className="mt-4 rounded-lg border bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-md font-medium">Participants</div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSharePanelOpen(true)}
                  className="text-md flex items-center font-bold text-primary hover:underline"
                >
                  <SquarePen className="mr-1 h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteShareConfirmOpen(true)}
                  className="text-md flex items-center font-bold text-red-600 hover:underline"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remove share %
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-md text-gray-600">
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">Type</th>
                    <th className="px-2 py-1">Employee Name</th>
                    <th className="px-2 py-1">Percentage</th>
                    <th className="px-2 py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {displayParticipants.map((p: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-2 align-top">{idx + 1}</td>
                      <td className="px-2 py-2 align-top">
                        {p.employee_type ?? "-"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {p.guest_name ||
                          p.employee_name ||
                          p.employee ||
                          p.name ||
                          "-"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {p.percentage !== undefined && p.percentage !== null
                          ? `${p.percentage}%`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {(
                          p.amount ??
                          p.allocated_amount
                        ) !== undefined &&
                          (
                            p.amount ??
                            p.allocated_amount
                          ) !== null
                          ? `INR ${Number(p.amount ?? p.allocated_amount).toFixed(2)}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AttachmentPreviewVanillaV2
          currentAttachments={visibleAttachments}
          onRemove={(index) => removeFormioFile("attach_receipt", index)}
          portalId="attachment-preview-portal-v2"
        />

        {customFileComponents.map((comp: any) => {
          const files = toAttachmentArray(dynamicFormData[comp.key]);

          if (files.length === 0) return null;

          return (
            <AttachmentPreviewVanillaV2
              key={String(comp.key)}
              currentAttachments={files}
              onRemove={(index) =>
                removeFormioFile(String(comp.key), index)
              }
              compKey={String(comp.key)}
              heading={comp.label || "Attachments Preview"}
            />
          );
        })}

        {selectedExpenseType && !isFetchingExpenseFields && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {isEditingExistingExpense ? (
              <>
                {isDraftExpenseEdit ? (
                  <>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={handleSave}
                      className="w-full font-semibold sm:w-fit"
                    >
                      Save
                    </Button>
                    <Button
                      bgColor="primary"
                      size="md"
                      onClick={handleSaveAndSubmitClick}
                      className="w-full font-semibold shadow-sm sm:w-fit"
                    >
                      Save & Submit
                    </Button>
                  </>
                ) : (
                  <Button
                    bgColor="primary"
                    size="md"
                    onClick={handleUpdate}
                    className="w-full font-semibold shadow-sm sm:w-fit"
                  >
                    Resubmit
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleSave}
                  className="w-full font-semibold sm:w-fit"
                >
                  Save
                </Button>
                <Button
                  bgColor="primary"
                  size="md"
                  onClick={handleSaveAndSubmitClick}
                  className="w-full font-semibold shadow-sm sm:w-fit"
                >
                  Save & Submit
                </Button>
              </>
            )}
          </div>
        )}

        {isAcknowledgementOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold">Acknowledgement</h3>
              <p className="mb-2 font-medium">I acknowledge that:</p>
              <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
                <li>
                  I have raised the expense as per the policy-defined limits
                </li>
                <li>I have attached payment proof for all bills</li>
                <li>
                  I have uploaded the approval email screenshot for exceptional
                  expenses.
                </li>
              </ul>
              <div className="mb-4 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="ack-checkbox-v2"
                  checked={isAcknowledgementChecked}
                  onChange={(e) =>
                    setIsAcknowledgementChecked(e.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="ack-checkbox-v2"
                  className="cursor-pointer text-sm text-gray-800"
                >
                  Otherwise I acknowledge that, the claim may be rejected on a
                  later stage.
                </label>
              </div>

              {pendingSubmissionType === "Relocation" && (
                <div className="mb-6 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="relocation-ack-checkbox-v2"
                    checked={isRelocationAcknowledgementChecked}
                    onChange={(e) =>
                      setIsRelocationAcknowledgementChecked(e.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="relocation-ack-checkbox-v2"
                    className="cursor-pointer text-sm text-gray-800"
                  >
                    I acknowledge that I am claiming this for my family
                    relocation
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsAcknowledgementOpen(false)}
                >
                  Cancel
                </Button>
                <Button bgColor="primary" onClick={handleProceedSubmit}>
                  Confirm & Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {isSharePanelOpen && isShareAllowed && (
          <ParticipantsDrawer
            isOpen={isSharePanelOpen}
            onClose={() => setIsSharePanelOpen(false)}
            expenseAmount={Number(dynamicFormData?.amount ?? 0)}
            initialParticipants={displayParticipants}
            currentEmployee={currentEmployee as any}
            maxParticipants={maxAllowedParticipants}
            employeeOptions={employeesList as any}
            employeeOptionsLoading={isLoadingEmployees}
            onSave={(formattedParticipants) => {
              setDynamicFormData((prev: any) => ({
                ...prev,
                participants: formattedParticipants,
                shareExpenseCheckbox:
                  formattedParticipants.length > 0
                    ? true
                    : prev?.shareExpenseCheckbox,
              }));
              setIsSharePanelOpen(false);
            }}
          />
        )}

        {isDeleteShareConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-600">
                <Trash2 className="h-5 w-5" /> Confirm Removal
              </h3>
              <p className="mb-6 text-sm text-gray-700">
                Are you sure you want to remove the shared expense? This will
                delete all added participants.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="md"
                  className="font-semibold"
                  onClick={() => setIsDeleteShareConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="md"
                  className="bg-red-600 font-semibold text-white"
                  onClick={() => {
                    setDynamicFormData((prev) => ({
                      ...prev,
                      participants: [],
                      shareExpenseCheckbox: false,
                    }));
                    setIsDeleteShareConfirmOpen(false);
                    setIsSharePanelOpen(false);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper
        title={isEditingExistingExpense ? "Edit Expense" : "Add Expense"}
      >
        {FormContent}
      </DesktopLayoutWrapper>
    );
  }

  return <div className="h-screen bg-white">{FormContent}</div>;
};

export default AddExpenseFormV2;
