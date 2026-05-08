import { useQueryClient } from "@tanstack/react-query";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { X } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useLoadingOverlay } from "../../context/OverlayContext";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import {
  useCheckAttachmentMandatory,
  useCreateLeaveApplication,
  useEditApprovedLeave,
  useGetAttendanceStatus,
  useGetLeaveBalance,
  useGetLeaveReason,
  useGetLeaveRequestFields,
  useGetNumberOfLeaveDays,
  useGetLeaveDateRange,
} from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useRequiredFields } from "../../hooks/useRequiredFields";
import { useScreenSize } from "../../hooks/useScreenSize";
import { LeaveFieldFlags } from "../../types/leaves";
import { expenseService } from "../../services/expenseService";
import FrappeAPI from "../../utils/frappeAPI";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { buildLeavePayload, getDatesBetween } from "../../utils/helperUtils";
import { useRequestLeaveModal } from "../Leaves/RequestLeaveModalContext";
import Button from "../shared/atoms/Button";
import AttendanceStatusModal from "./AttendanceStatusModal";
import DailyConfiguration from "./DailyConfiguration";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import { useFileUploader } from "../../hooks/useFileUploader";
import { FilePreviewModal } from "../shared/molecules/FilePreviewModal";

interface FormSubmissionData {
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  halfDay?: boolean;
  half_day?: 0 | 1;
  halfDayOption?: "First Half" | "Second Half";
  description?: string;
  half_day_date?: string;
  custom_second_half_day_date?: string;
  attachment?: { url: string }[];
  custom_reason?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_attachment?: any[];
}

interface RequestLeaveProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AttachmentPreviewVanilla: React.FC<{ 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentAttachments: any[]; 
  onPreview: (file: { url: string; name: string }) => void 
}> = ({ currentAttachments, onPreview }) => {
  useEffect(() => {
    console.log("AttachmentPreviewVanilla - currentAttachments:", currentAttachments);
    const interval = setInterval(() => {
      const portal = document.getElementById("attachment-preview-portal");
      if (!portal) return;

      const hash = currentAttachments.map(a => a.url || a.originalName || a.name || "file").join("|");

      if (portal.getAttribute("data-hash") === hash) {
        if (portal.children.length > 0) return;
      }

      portal.setAttribute("data-hash", hash);

      if (currentAttachments.length === 0) {
        portal.innerHTML = "";
        return;
      }

      let html = '<div class="h-full px-2 lg:px-6">';
      html += '<h3 class="text-md font-medium mb-2 text-gray-800">Attachments Preview</h3>';
      html += '<div class="flex flex-wrap gap-3">';

      console.log("Rendering attachments:", currentAttachments);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentAttachments.forEach((f: any) => {
        let actualFile = f.file;
        if (actualFile && !(actualFile instanceof Blob || actualFile instanceof File)) {
          actualFile = null;
        }
        const url = f.url;
        if (!actualFile && !url) return;
        let parsedUrl = url;
        if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('blob:')) {
          parsedUrl = `/files/${url}`;
        }
        const previewUrl = actualFile ? URL.createObjectURL(actualFile) : parsedUrl;
        const isImage = actualFile
          ? actualFile.type?.startsWith("image/")
          : (f.type?.startsWith("image/") || /\.(jpeg|jpg|gif|png|webp|svg|ico)$/i.test(f.name || ""));
        const safeName = (f.originalName || f.name || "Attachment").replace(/"/g, '&quot;');

        html += '<div class="flex items-center gap-3 rounded-lg p-2 shadow-sm bg-gray-50 hover:bg-white transition-colors w-fit max-w-[300px]" style="border: 1px solid #cbd5e1 !important;">';

        if (isImage) {
          html += `<img src="${previewUrl}" alt="${safeName}" class="w-12 h-12 object-cover rounded shadow-sm cursor-pointer shrink-0 preview-image-trigger" data-preview-url="${previewUrl}" data-preview-name="${safeName}" style="border: 1px solid #cbd5e1 !important;" />`;
        } else {
          html += `<div class="w-12 h-12 flex items-center justify-center bg-gray-200 shadow-sm rounded cursor-pointer text-[10px] font-semibold text-gray-600 uppercase shrink-0 preview-image-trigger" data-preview-url="${previewUrl}" data-preview-name="${safeName}" style="border: 1px solid #cbd5e1 !important;">Open</div>`;
        }
        html += `<p class="text-sm text-gray-700 font-medium truncate max-w-[180px] cursor-pointer preview-image-trigger" data-preview-url="${previewUrl}" data-preview-name="${safeName}" title="${safeName}">${safeName}</p>`;
        html += '</div>';
      });

      html += '</div></div>';
      portal.innerHTML = html;

      const triggers = portal.querySelectorAll('.preview-image-trigger');
      triggers.forEach(el => {
        el.addEventListener('click', () => {
          const uri = el.getAttribute('data-preview-url');
          const name = el.getAttribute('data-preview-name');
          if (uri && name) onPreview({ url: uri, name });
          else if (uri) onPreview({ url: uri, name: "Attachment" });
        });
      });

    }, 500);

    return () => clearInterval(interval);
  }, [currentAttachments, onPreview]);

  return null;
};

const RequestLeave: React.FC<RequestLeaveProps> = ({ onSuccess, onCancel }) => {
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);
  const { setRefetchAttendance } = useGlobalStore();
  const today = new Date().toISOString().split("T")[0];
  const { data: leaveBalanceData } = useGetLeaveBalance(
    currentEmployee?.name,
    today,
  );
  const { uploadFiles, loading: isUploadingFiles } = useFileUploader();
  const [formData, setFormData] = useState<FormSubmissionData>({});

  const { data: attendanceStatus } = useGetAttendanceStatus(
    currentEmployee?.name,
    formData.fromDate || today,
    formData.toDate || today,
  );
  const queryClient = useQueryClient();
  const { defaults } = useRequestLeaveModal();
  const editLeaveMutation = useEditApprovedLeave();
  const { triggerRefetch } = useLeaveRequestRefresh();
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const isRequestRoute = location.pathname === "/webapp/leave-app/request";
  const navigate = useNavigate();
  const [dailyConfig, setDailyConfig] = useState<
    Record<string, "Full Day" | "First Half" | "Second Half">
  >({});
  const loading = useLoadingOverlay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentAttachments, setCurrentAttachments] = useState<any[]>([]);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  const handleUpdate = useCallback(async () => {
    if (!currentEmployee?.name) {
      toast.error("Employee data not loaded.");
      return;
    }
    if (!formInstance?.current) {
      return;
    }
    try {
      const submission = await formInstance.current.submit();


      const payload = buildLeavePayload({
        employee: currentEmployee.name,
        submission: submission.data,
        dailyConfig:
          dailyConfig,
      });

      if (defaults?.isResubmit) {
        await loading?.wrap(async () => {
          const attachmentUrls = currentAttachments
            .filter((a) => a.url && !a.file)
            .map((a) => a.url);
          await FrappeAPI.updateDocument(
            "Leave Application",
            defaults.leave_application || "",
            { ...payload, custom_attachment: attachmentUrls.length > 0 ? attachmentUrls : undefined },
          );
          await expenseService.resubmitApprovalEvent(
            "Leave Application",
            defaults?.leave_application || "",
          );
          if (currentAttachments.some((a) => a.file)) {
            await uploadFiles(
              currentAttachments.filter((a) => a.file),
              "Leave Application",
              defaults.leave_application || "",
            );
          }
        }, "Resubmitting Leave Request...");
      } else {
        const attachmentUrls = currentAttachments
          .filter((a) => a.url && !a.file)
          .map((a) => a.url);
        await editLeaveMutation.mutateAsync({
          leave_application: defaults?.leave_application || "",
          new_values: {
            employee: currentEmployee.name,
            leave_type: submission.data.leaveType,
            from_date: submission.data.fromDate?.split("T")[0],
            to_date: submission.data.toDate?.split("T")[0],
            half_day: Object.values(dailyConfig).some((v) => v !== "Full Day") ? 1 : 0,
            description: submission.data.description,
            custom_reason: submission.data.custom_reason,
            custom_attachment: attachmentUrls.length > 0 ? attachmentUrls : undefined,
            daily_half_day_config: dailyConfig,
          },
        });
        if (currentAttachments.some((a) => a.file)) {
          await uploadFiles(
            currentAttachments.filter((a) => a.file),
            "Leave Application",
            defaults?.leave_application || "",
          );
        }
      }

      setTimeout(() => {
        setRefetchAttendance(true);
      }, 2000);

      queryClient.invalidateQueries({ queryKey: ["attendance"] });

      onSuccess?.();
      onCancel?.();
    } catch (error) {
      console.error("Update submit error:", error);
    }
  }, [
    currentEmployee,
    editLeaveMutation,
    defaults,
    onSuccess,
    onCancel,
    dailyConfig,
    queryClient,
    setRefetchAttendance,
    loading,
    currentAttachments,
    uploadFiles,
  ]);

  const createLeaveMutation = useCreateLeaveApplication();

  const [leaveDays, setLeaveDays] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formInstance = useRef<any>(null);

  const [showAttendanceButton, setShowAttendanceButton] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const showDailyConfig = Boolean(
    formData.fromDate &&
    formData.toDate &&
    Object.keys(dailyConfig).length > 0,
  );

  const leaveTypeOptions = useMemo(() => {
    if (defaults?.source === "holiday" && defaults?.leaveType) {
      return [
        {
          label: `${defaults.leaveTypeName || "Optional Holiday"}`,
          value: defaults.leaveType,
        },
      ];
    }

    if (!leaveBalanceData?.leave_balance) return [];

    return leaveBalanceData.leave_balance
      .filter((entry) => entry.dont_show_in_frontend === 0)
      .map((entry) => ({
        label: `${entry.type}`,
        value: entry.leave_id,
      }));
  }, [
    leaveBalanceData,
    defaults?.source,
    defaults?.leaveType,
    defaults?.leaveTypeName,
  ]);

  const leaveBalanceMap = useMemo(() => {
    if (!leaveBalanceData?.leave_balance) return {};
    return leaveBalanceData.leave_balance.reduce(
      (acc: Record<string, number>, entry) => {
        acc[entry.leave_id] = entry.balance;
        return acc;
      },
      {},
    );
  }, [leaveBalanceData]);

  const selectedLeaveBalance =
    formData.leaveType && leaveBalanceMap[formData.leaveType]
      ? leaveBalanceMap[formData.leaveType]
      : null;

  const individualDatesStr = useMemo(() => {
    if (!formData.fromDate || !formData.toDate) return undefined;
    const dates = getDatesBetween(formData.fromDate, formData.toDate);

    const individualDates = dates.map((d) => {
      const config = dailyConfig[d] || "Full Day";
      const isHalfDay = config === "First Half" || config === "Second Half" ? 1 : 0;
      return { date: d, half_day: isHalfDay };
    });
    return JSON.stringify(individualDates);
  }, [formData.fromDate, formData.toDate, dailyConfig]);

  const { data: leaveDaysResponse } = useGetNumberOfLeaveDays(
    currentEmployee?.name,
    formData.leaveType,
    formData.fromDate?.split("T")[0],
    formData.toDate?.split("T")[0],
    individualDatesStr,
  );

  useEffect(() => {
    if (leaveDaysResponse !== undefined) {
      setLeaveDays(leaveDaysResponse);
    }
  }, [leaveDaysResponse]);

  const { data: fields } = useGetLeaveRequestFields(
    formData.leaveType,
    formData.fromDate || undefined,
    formData.toDate || undefined,
  );
  
  const { data: dateRangeData } = useGetLeaveDateRange(
    currentEmployee?.name,
    formData.leaveType
  );

  const { data: requiredFields } = useRequiredFields("Leave Application");
  const requiredFieldMap = useMemo(() => {
    if (!requiredFields?.fields) return {};
    const map: Record<string, boolean> = {};
    requiredFields.fields.forEach((f) => {
      if (f.fieldname) map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
    });
    return map;
  }, [requiredFields]);

  const {
    data: reasons,
    isLoading: isReasonLoading,
    isError: isReasonError,
  } = useGetLeaveReason();

  const { data: attachmentMandatoryData } = useCheckAttachmentMandatory(
    formData.leaveType,
  );

  const isAttachmentMandatory = attachmentMandatoryData?.is_mandatory === 1;

  useEffect(() => {
    if (defaults) {
      const initial: FormSubmissionData = {
        leaveType: defaults.leaveType,
        fromDate: defaults.fromDate,
        toDate: defaults.toDate,
        halfDay: defaults.halfDay,
        halfDayOption: defaults.halfDayOption,
        half_day_date: defaults.half_day_date,
        custom_second_half_day_date: defaults.custom_second_half_day_date,
        description: defaults.description,
        custom_reason: defaults.custom_reason,
        attachment: defaults.custom_attachment,
      };

      setFormData(initial);
      if (defaults.custom_attachment) {
        const attachments = defaults.custom_attachment.map((att: { url: string }) => ({
          name: att.url.split("/").pop() || att.url,
          url: att.url,
          storage: "url",
          originalName: att.url.split("/").pop() || att.url,
        }));
        setCurrentAttachments(attachments);
      } else {
        setCurrentAttachments([]);
      }
    } else {
      const todayWithTime = `${today}T00:00:00+05:30`;
      const initial: FormSubmissionData = {
        fromDate: todayWithTime,
      };
      setFormData(initial);
      setCurrentAttachments([]);
    }
  }, [defaults, today]);

  useEffect(() => {
    if (dateRangeData?.min_date || dateRangeData?.max_date) {
      setFormData((prev) => {
        let updated = false;
        const newFormData = { ...prev };

        if (dateRangeData.min_date) {
          const minDate = new Date(dateRangeData.min_date).setHours(0, 0, 0, 0);
          if (prev.fromDate) {
            const currentFrom = new Date(prev.fromDate).setHours(0, 0, 0, 0);
            if (currentFrom < minDate) {
              newFormData.fromDate = `${dateRangeData.min_date}T00:00:00`;
              updated = true;
            }
          } else {
            newFormData.fromDate = `${dateRangeData.min_date}T00:00:00`;
            updated = true;
          }
        }

        if (dateRangeData.max_date) {
          const maxDate = new Date(dateRangeData.max_date).setHours(0, 0, 0, 0);
          if (prev.toDate) {
            const currentTo = new Date(prev.toDate).setHours(0, 0, 0, 0);
            if (currentTo > maxDate) {
              newFormData.toDate = `${dateRangeData.max_date}T00:00:00`;
              updated = true;
            }
          }
        }

        return updated ? newFormData : prev;
      });
    }
  }, [dateRangeData]);

  useEffect(() => {
    setShowAttendanceButton(Boolean(formData.fromDate && formData.toDate));
  }, [formData.fromDate, formData.toDate]);

  const handleSubmit = useCallback(async () => {
    console.log("handleSubmit called");
    console.log("currentAttachments at submit time:", currentAttachments);
    if (!currentEmployee?.name || !formInstance.current) {
      console.log("Early return: currentEmployee:", currentEmployee?.name, "formInstance:", !!formInstance.current);
      return;
    }

    try {
      console.log("About to submit form");
      const submission = await formInstance.current.submit();
      console.log("Form submission result:", submission);
      console.log("Submission data:", submission?.data);
      console.log("Custom attachment from submission:", submission?.data?.custom_attachment);
      console.log("formInstance submission:", formInstance.current?.submission);


      // Get files from form instance directly as primary source
      const fileComponent = formInstance.current?.getComponent("custom_attachment");
      const filesFromForm = fileComponent?.value || [];
      console.log("Files from form component:", filesFromForm);

      // Combine files from state and form (prefer form instance)
      const allFiles = [...currentAttachments, ...filesFromForm];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uniqueFiles = allFiles.filter((file: any, index: number, self: any[]) =>
        index === self.findIndex((f) => (f.name || f.originalName) === (file.name || file.originalName))
      );
      console.log("Unique files to upload:", uniqueFiles);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log("Files with .file property:", uniqueFiles.filter((f: any) => f.file));

      const payload = buildLeavePayload({
        employee: currentEmployee.name,
        submission: submission.data,
        dailyConfig:
          dailyConfig,
      });

      await loading?.wrap(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await createLeaveMutation.mutateAsync(payload);
        console.log("Leave response:", response);
        const leaveApplicationName = response?.leave_application?.name || response?.name || response?.data?.name;
        console.log("Leave application name:", leaveApplicationName);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filesWithFileProperty = uniqueFiles.filter((f: any) => f.file);
        console.log("Files to upload (with .file):", filesWithFileProperty);

        if (leaveApplicationName && filesWithFileProperty.length > 0) {
          console.log("Calling uploadFiles...");
          await uploadFiles(
            filesWithFileProperty,
            "Leave Application",
            leaveApplicationName,
          );
        }
      }, "Submitting  Leave Request...");
      toast.success("Leave request submitted successfully!");
      triggerRefetch();
      setCurrentAttachments([]);
      onSuccess?.();
      onCancel?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const formatted = errorResponseFormater(
        err,
        err?.[0]?.message?.toString() ?? "Failed to Submit Leave Request",
      );
      toast.error(formatted);
    }
  }, [
    currentEmployee,
    dailyConfig,
    createLeaveMutation,
    onCancel,
    onSuccess,
    triggerRefetch,
    loading,
    currentAttachments,
    uploadFiles,
  ]);

  const leaveForm = useMemo(() => {
    const defaultFieldFlags: LeaveFieldFlags = {
      leave_type: 1,
      from_date: 1,
      to_date: 1,
      custom_reason: 0,
      description: 0,
      custom_attachment: 0,
      half_day: 0,
      half_day_date: 0,
      custom_second_half_day_date: 0,
      show_half_day_options: 0,
      show_individual_continuous: 0,
    };

    const mandatory: LeaveFieldFlags = fields?.mandatory ?? defaultFieldFlags;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const halfDayComponents: any[] = [];

    const panelComponents = [
      {
        type: "select",
        key: "leaveType",
        label: "Leave Type <span style='color:red;margin-left:3px;'> *</span>",
        errorLabel: "Leave Type",
        placeholder: "Select Leave Type",
        input: true,
        defaultValue: defaults?.leaveType ?? "",
        validate: { required: true },
        data: { values: leaveTypeOptions },
        customClass: "px-2 mb-4",
        disabled: defaults?.isEdit ? false : Boolean(defaults?.leaveType),
      },

      {
        type: "textarea",
        key: "description",
        label:
          mandatory?.description || requiredFieldMap["description"]
            ? "Message <span style='color:red;margin-left:3px;'> *</span>"
            : "Message",
        errorLabel: "Message",
        defaultValue: defaults?.description ?? "",
        placeholder: "Enter the message for leave",
        rows: 3,
        validate: {
          required: !!mandatory.description || requiredFieldMap["description"],
          minLength: 3,
        },
        input: true,
        customClass: "px-2 my-3",
      },

      ...(defaults?.source !== "holiday"
        ? [
          {
            type: "select",
            key: "custom_reason",
            label:
              mandatory?.custom_reason || requiredFieldMap["custom_reason"]
                ? "Reason <span style='color:red;margin-left:3px;'> *</span>"
                : "Reason",
            errorLabel: "Reason",
            placeholder: "Select a reason",
            defaultValue: defaults?.custom_reason ?? "",
            input: true,
            validate: {
              required:
                !!mandatory.custom_reason ||
                requiredFieldMap["custom_reason"],
            },
            data: {
              values:
                reasons?.map((r) => ({
                  label: r.reason,
                  value: r.name,
                })) ?? [],
            },
            customClass: "px-2 mb-4",
            disabled: isReasonLoading || isReasonError,
          },
        ]
        : []),

      ...(defaults?.source !== "holiday"
        ? [
          {
            type: "columns",
            key: "attachmentColumns",
            customClass: "px-2",
            columns: [
              {
                width: 6,
                components: [
                  {
                    type: "file",
                    key: "custom_attachment",
                    defaultValue: currentAttachments.length > 0 ? currentAttachments : [],
                    label:
                      fields?.mandatory?.custom_attachment || isAttachmentMandatory
                        ? "Attachments <span style='color:red;margin-left:3px;'> *</span>"
                        : "Attachments",
                    errorLabel: "Attachments",
                    input: true,
                    multiple: true,
                    storage: "customfiles",
                    validate: {
                      required:
                        !!mandatory.custom_attachment ||
                        requiredFieldMap["custom_attachment"] ||
                        isAttachmentMandatory,
                    },
                    filePattern: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.xls",
                    customClass: "mb-4",
                  },
                ],
              },
              {
                width: 6,
                components: [
                  {
                    type: "htmlelement",
                    tag: "div",
                    attrs: [{ attr: "id", value: "attachment-preview-portal" }],
                    content: "",
                  },
                ],
              },
            ],
          },
        ]
        : []),

      {
        type: "columns",
        key: "dateColumns",
        customClass: "px-2",
        columns: [
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "fromDate",
                label: requiredFieldMap["from_date"]
                  ? "From Date <span style='color:red;margin-left:3px;'> *</span>"
                  : "From Date",
                errorLabel: "From Date",
                placeholder: "DD-MM-YYYY",
                enableDate: true,
                enableTime: false,
                defaultValue:
                  defaults?.source === "balances"
                    ? `${today}T00:00:00+05:30`
                    : defaults?.fromDate
                      ? `${defaults.fromDate}T00:00:00`
                      : "",
                validate: { required: requiredFieldMap["from_date"] },
                input: true,
                customClass: "mb-4",
                format: "dd-MM-yyyy",
                datePicker: {
                  minDate: dateRangeData?.min_date || undefined,
                  maxDate: dateRangeData?.max_date || undefined,
                },
                // disabled: defaults?.isEdit
                //   ? false
                //   : Boolean(defaults?.fromDate),
                disabled:
                  !defaults?.isEdit &&
                  defaults?.source !== "other" &&
                  Boolean(defaults?.fromDate),
              },
            ],
          },
          {
            width: 6,
            components: [
              {
                type: "datetime",
                key: "toDate",
                label: requiredFieldMap["to_date"]
                  ? "To Date <span style='color:red;margin-left:3px;'> *</span>"
                  : "To Date",
                errorLabel: "To Date",
                placeholder: "DD-MM-YYYY",
                enableDate: true,
                enableTime: false,
                defaultValue: defaults?.toDate
                  ? `${defaults.toDate}T00:00:00`
                  : "",
                validate: {
                  required: requiredFieldMap["to_date"],
                  custom: "if (!input || !data.fromDate) { valid = true; } else { valid = (new Date(input).setHours(0,0,0,0) >= new Date(data.fromDate).setHours(0,0,0,0)) ? true : \"To Date cannot be before From Date\"; }",
                },
                input: true,
                customClass: "mb-4",
                format: "dd-MM-yyyy",
                datePicker: {
                  minDate: formData.fromDate || dateRangeData?.min_date || today,
                  maxDate: dateRangeData?.max_date || undefined,
                },
                // disabled: defaults?.isEdit ? false : Boolean(defaults?.toDate),
                disabled:
                  !defaults?.isEdit &&
                  defaults?.source !== "other" &&
                  Boolean(defaults?.toDate),
              },
            ],
          },
        ],
      },

      ...(defaults?.hideHalfDayToggle ? [] : halfDayComponents),
    ];

    return {
      components: [
        {
          type: "panel",
          key: "leavePanel",
          title: "Leave Application",
          hideLabel: true,
          customClass: "px-2",
          components: panelComponents,
        },
      ],
    };
  }, [
    fields,
    reasons,
    isReasonLoading,
    isReasonError,
    leaveTypeOptions,
    defaults,
    requiredFieldMap,
    isAttachmentMandatory,
    today,
    currentAttachments,
    formData.fromDate,
    dateRangeData,
  ]);

  const handleAttendanceClick = useCallback(() => {
    setIsAttendanceModalOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
        <h2 className="text-lg font-semibold text-gray-800">Request Leave</h2>
        {isDesktop && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isRequestRoute) {
                navigate(-1);
              }
              onCancel?.();
              onSuccess?.();
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>

      <div className="flex justify-between items-center ml-6 my-2 text-sm text-gray-700">
        <div style={{ visibility: leaveDays !== null ? "visible" : "hidden" }}>
          <strong>Applying for:</strong> {leaveDays}{" "}
          {leaveDays === 1 ? "Day" : "Days"}
        </div>

        <div className="mr-6 flex flex-col items-end">
          {selectedLeaveBalance !== null && (
            <div>
              <strong>Available Balance:</strong> {selectedLeaveBalance}
            </div>
          )}
          {showAttendanceButton && (
            <Button
              onClick={handleAttendanceClick}
              variant="outline"
              className="mt-2"
            >
              Attendance Status
            </Button>
          )}
        </div>
      </div>


      <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
        <Form
          form={leaveForm}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onFormReady={(instance: any) => {
            formInstance.current = instance;

            if (!defaults?.fromDate) {
              const fromDateComponent = instance.getComponent("fromDate");
              if (fromDateComponent) {
                fromDateComponent.setValue(`${today}T00:00:00+05:30`);
              }
            }
          }}
          options={{
            builder: { styles: false },
            submitButton: false,
            alerts: false,
            noAlerts: true,
            disableOnSubmit: true,
            formClass: "space-y-6",
            rowClass: "flex flex-col",
            labelClass: "mb-1 font-medium text-gray-700",
            inputClass:
              "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200",
            validateOnInit: false,
            validateOnBlur: false,
            validateOnChange: false,
            suffix: "",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(change: any) => {
            console.log("onChange called:", change);
            const data = change.data as FormSubmissionData;
            const changed = change.changed;
            console.log("custom_attachment from onChange:", data?.custom_attachment);
            setFormData(data);
            if (data.fromDate && data.toDate) {
              const dates = getDatesBetween(data.fromDate, data.toDate);

              setDailyConfig((prev) => {
                const next: Record<
                  string,
                  "Full Day" | "First Half" | "Second Half"
                > = {};
                dates.forEach((d) => {
                  next[d] = prev[d] ?? "Full Day";
                });
                return next;
              });
            } else {
              setDailyConfig({});
            }

            const newAttachments = [...(data?.custom_attachment || [])];
            console.log("onChange - newAttachments from form:", newAttachments);
            setCurrentAttachments(prev => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const stripFile = (arr: any[]) => arr.map((p: any) => ({ ...p, file: undefined }));
              console.log("onChange - prev:", prev, "newAttachments:", newAttachments);
              if (JSON.stringify(stripFile(prev)) !== JSON.stringify(stripFile(newAttachments))) {
                return newAttachments;
              }
              return prev;
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hasFilesWithoutUrl = newAttachments.some((f: any) => !f.url && !f.storage);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hasFilesWithUrl = newAttachments.some((f: any) => f.url || f.storage);

            if (hasFilesWithoutUrl && !hasFilesWithUrl) {
              setIsFileProcessing(true);
              if (changed?.component?.key === "custom_attachment") {
                toast.loading("Processing attachments...", { id: "file-processing" });
              }
            } else {
              setIsFileProcessing(false);
              toast.dismiss("file-processing");
            }
          }}
        />
        {showDailyConfig && (
          <DailyConfiguration
            fromDate={formData.fromDate!}
            toDate={formData.toDate!}
            value={dailyConfig}
            onChange={setDailyConfig}
            attendanceStatus={attendanceStatus}
          />
        )}
      </div>
      <div className="border-gray-200 border-t py-3 px-2 flex flex-row md:flex-row gap-3 md:gap-4 md:justify-end">
        {!isDesktop && (
          <Button
            onClick={(e) => {
              e.stopPropagation();

              if (onCancel) {
                onCancel();
              }
              if (isRequestRoute) {
                navigate(-1);
              }
            }}
            size="md"
            variant="outline"
            className="w-full md:w-auto min-w-[150px] md:px-4 md:py-2.5 lg:px-7 rounded-md font-brand"
          >
            {createLeaveMutation.isPending ? "Processing..." : "Cancel"}
          </Button>
        )}

        {!defaults?.isEdit ? (
          <Button
            onClick={handleSubmit}
            size="md"
            variant="contain"
            bgColor="primary"
            disabled={createLeaveMutation.isPending || isFileProcessing || isUploadingFiles}
            className="w-full md:w-auto min-w-[150px] md:px-4 md:py-2.5 rounded-md font-brand"
          >
            {createLeaveMutation.isPending
              ? "Processing..."
              : isFileProcessing
                ? "Processing..."
                : isUploadingFiles
                  ? "Uploading..."
                  : "Submit"}
          </Button>
        ) : (
          <Button
            onClick={handleUpdate}
            size="md"
            variant="contain"
            bgColor="primary"
            disabled={editLeaveMutation.isPending || isFileProcessing || isUploadingFiles}
            className="w-full md:w-auto min-w-[201px] md:px-4 md:py-2.5 rounded-md font-brand"
          >
            {editLeaveMutation.isPending
              ? "Updating..."
              : isFileProcessing
                ? "Processing..."
                : isUploadingFiles
                  ? "Uploading..."
                  : defaults?.isResubmit
                    ? "Resubmit Request"
                    : "Update Request"}
          </Button>
        )}
      </div>

      <AttachmentPreviewVanilla
        currentAttachments={currentAttachments}
        onPreview={setPreviewFile}
      />

      {isAttendanceModalOpen && (
        <AttendanceStatusModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          fromDate={formData.fromDate || ""}
          toDate={formData.toDate || ""}
        />
      )}

      {previewFile && (
        <FilePreviewModal 
          fileUrl={previewFile.url} 
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)} 
        />
      )}
    </div>
  );
};

export default RequestLeave;
