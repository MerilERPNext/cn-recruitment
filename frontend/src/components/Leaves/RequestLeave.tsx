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
import {
  FormSubmissionData,
  RequestLeaveProps,
} from "../../types/leaves";
import { expenseService } from "../../services/expenseService";
import FrappeAPI from "../../utils/frappeAPI";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { buildLeavePayload, getDatesBetween } from "../../utils/helperUtils";
import { useRequestLeaveModal } from "../Leaves/RequestLeaveModalContext";
import Button from "../shared/atoms/Button";
import AttendanceStatusModal from "./AttendanceStatusModal";
import DailyConfiguration from "./DailyConfiguration";
import { useLeaveRequestRefresh } from "./LeaveRequestRefreshContext";
import RequestLeaveAttachmentPreview from "./RequestLeaveAttachmentPreview";
import { buildRequestLeaveSchema } from "./requestLeaveSchema";
import {
  findRecentLeaveApplicationTarget,
  getExistingAttachmentUrls,
  normalizeAttachments,
  resolvePendingAttachmentUploads,
  resolveLeaveApplicationTarget,
} from "./requestLeaveHelper";
import { useFileUploader } from "../../hooks/useFileUploader";
import { FilePreviewModal } from "../shared/molecules/FilePreviewModal";

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
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const removeFormioFile = useCallback((index: number) => {
    try {
      const container = document.querySelector(".formio-component-custom_attachment");
      if (container) {
        const removeButtons = container.querySelectorAll(
          'i[ref="fileStatusRemove"], i[ref="removeLink"], button[ref="removeLink"], i.fa-times',
        );
        if (removeButtons && removeButtons[index]) {
          (removeButtons[index] as HTMLElement).click();
        } else {
          console.error("Form.io native remove button not found");
        }
      }
    } catch (err) {
      console.error("Failed to cleanly remove attachment:", err);
    }
  }, []);

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
      const normalizedAttachments = normalizeAttachments(
        currentAttachments,
        submission.data?.custom_attachment,
      );
      const retainedAttachmentUrls = new Set(
        getExistingAttachmentUrls(normalizedAttachments),
      );
      const pendingUploads = resolvePendingAttachmentUploads(
        currentAttachments,
        submission.data?.custom_attachment,
      );

      const payload = buildLeavePayload({
        employee: currentEmployee.name,
        submission: submission.data,
        dailyConfig: dailyConfig,
      });

      const syncRemovedAttachments = async () => {
        const leaveApplicationName = defaults?.leave_application;

        if (!leaveApplicationName) {
          return;
        }

        const existingFileDocuments = await expenseService.getFilesByAttachment(
          "Leave Application",
          leaveApplicationName,
        );

        const filesToDelete = existingFileDocuments.filter((fileDocument) => {
          const fileUrl =
            typeof fileDocument?.file_url === "string"
              ? fileDocument.file_url
              : "";

          return Boolean(fileUrl) && !retainedAttachmentUrls.has(fileUrl);
        });

        await Promise.all(
          filesToDelete.map((fileDocument) =>
            expenseService.deleteFile(fileDocument.name),
          ),
        );
      };

      if (defaults?.isResubmit) {
        await loading?.wrap(async () => {
          await FrappeAPI.updateDocument(
            "Leave Application",
            defaults.leave_application || "",
            {
              ...payload,
              custom_attachment: null,
            },
          );
          await syncRemovedAttachments();
          await expenseService.resubmitApprovalEvent(
            "Leave Application",
            defaults?.leave_application || "",
          );
          if (pendingUploads.length > 0) {
            await uploadFiles(
              pendingUploads,
              "Leave Application",
              defaults.leave_application || "",
            );
          }
        }, "Resubmitting Leave Request...");
      } else {
        await editLeaveMutation.mutateAsync({
          leave_application: defaults?.leave_application || "",
          new_values: {
            employee: currentEmployee.name,
            leave_type: submission.data.leaveType,
            from_date: submission.data.fromDate?.split("T")[0],
            to_date: submission.data.toDate?.split("T")[0],
            half_day: Object.values(dailyConfig).some((v) => v !== "Full Day")
              ? 1
              : 0,
            description: submission.data.description,
            custom_reason: submission.data.custom_reason,
            custom_attachment: null,
            daily_half_day_config: dailyConfig,
          },
        });
        await syncRemovedAttachments();
        if (pendingUploads.length > 0) {
          await uploadFiles(
            pendingUploads,
            "Leave Application",
            defaults?.leave_application || "",
          );
        }
      }

      setTimeout(() => {
        setRefetchAttendance(true);
      }, 2000);

      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["get-All-Events-And-Attendance"] });
      queryClient.invalidateQueries({ queryKey: ["leave-buttons-status"] });

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
    formData.fromDate && formData.toDate && Object.keys(dailyConfig).length > 0,
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
      const isHalfDay =
        config === "First Half" || config === "Second Half" ? 1 : 0;
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
    formData.leaveType,
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
        const attachments = normalizeAttachments(defaults.custom_attachment);
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
    if (!currentEmployee?.name || !formInstance.current) {
      return;
    }

    // Snapshot File blobs before submit() — Form.io strips them during validation
    const fileSnapshot = currentAttachments.map((att) => ({
      index: currentAttachments.indexOf(att),
      file: att?.file instanceof Blob || att?.file instanceof File ? att.file : null,
    }));

    try {
      const submission = await formInstance.current.submit();

      // Restore File blobs that Form.io stripped during submit
      setCurrentAttachments((prev) =>
        prev.map((att, i) => {
          const snapshot = fileSnapshot.find((s) => s.index === i);
          if (snapshot?.file && !(att.file instanceof Blob || att.file instanceof File)) {
            return { ...att, file: snapshot.file };
          }
          return att;
        }),
      );

      const fileComponent =
        formInstance.current?.getComponent("custom_attachment");
      const filesFromForm =
        fileComponent?.dataValue || fileComponent?.value || [];

      const pendingUploads = resolvePendingAttachmentUploads(
        currentAttachments,
        submission?.data?.custom_attachment,
        filesFromForm,
      );

      const payload = buildLeavePayload({
        employee: currentEmployee.name,
        submission: submission.data,
        dailyConfig: dailyConfig,
      });

      await loading?.wrap(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await createLeaveMutation.mutateAsync(payload);
        const leaveTarget =
          resolveLeaveApplicationTarget(response) ||
          (await findRecentLeaveApplicationTarget({
            employee: currentEmployee.name,
            leaveType: payload.leave_type,
            fromDate: payload.from_date,
            toDate: payload.to_date,
          }));

        if (leaveTarget && pendingUploads.length > 0) {
          await uploadFiles(
            pendingUploads,
            leaveTarget.doctype,
            leaveTarget.docname,
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
      // Restore File blobs on validation failure so preview stays intact
      setCurrentAttachments((prev) =>
        prev.map((att, i) => {
          const snapshot = fileSnapshot.find((s) => s.index === i);
          if (snapshot?.file && !(att.file instanceof Blob || att.file instanceof File)) {
            return { ...att, file: snapshot.file };
          }
          return att;
        }),
      );
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

  const leaveForm = useMemo(
    () =>
      buildRequestLeaveSchema({
        dateRangeData,
        defaults,
        formFromDate: formData.fromDate,
        isAttachmentMandatory,
        isReasonError,
        isReasonLoading,
        leaveTypeOptions,
        mandatory: fields?.mandatory,
        reasons,
        requiredFieldMap,
        today,
      }),
    [
      dateRangeData,
      defaults,
      fields?.mandatory,
      formData.fromDate,
      isAttachmentMandatory,
      isReasonError,
      isReasonLoading,
      leaveTypeOptions,
      reasons,
      requiredFieldMap,
      today,
    ],
  );

  const handleAttendanceClick = useCallback(() => {
    setIsAttendanceModalOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
        <h2 className="text-lg font-semibold text-gray-800">
          {defaults?.source === "holiday"
            ? "Request Optional Holiday"
            : "Request Leave"}
        </h2>
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
            const data = change.data as FormSubmissionData;
            const changed = change.changed;
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

            if (changed?.component?.key === "custom_attachment") {
              const newAttachments = data?.custom_attachment || [];
              setCurrentAttachments(newAttachments);

              const hasFilesWithoutUrl = newAttachments.some(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (f: any) => !f.url && !f.file_url && !f.storage,
              );
              const hasFilesWithUrl = newAttachments.some(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (f: any) => f.url || f.file_url || f.storage,
              );

              if (hasFilesWithoutUrl && !hasFilesWithUrl) {
                setIsFileProcessing(true);
                toast.loading("Processing attachments...", {
                  id: "file-processing",
                });
              } else {
                setIsFileProcessing(false);
                toast.dismiss("file-processing");
              }
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
            disabled={
              createLeaveMutation.isPending ||
              isFileProcessing ||
              isUploadingFiles
            }
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
            disabled={
              editLeaveMutation.isPending ||
              isFileProcessing ||
              isUploadingFiles
            }
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

      <style>{`
        .formio-component-custom_attachment .list-group {
          display: none !important;
        }
      `}</style>

      <RequestLeaveAttachmentPreview
        currentAttachments={currentAttachments}
        onPreview={setPreviewFile}
        onRemove={removeFormioFile}
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
