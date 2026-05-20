import React, { useMemo, useRef, useState } from "react";
import { X, Copy } from "lucide-react";
import Button from "../shared/atoms/Button";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { FilePreviewModal } from "../shared/molecules/FilePreviewModal";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import {
  useGetLeaveBalance,
  useGetLeaveReason,
  useCreateLeaveApplicationBatch,
} from "../../hooks/useLeaves";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useFileUploader } from "../../hooks/useFileUploader";
import { useLoadingOverlay } from "../../context/OverlayContext";
import {
  findRecentLeaveApplicationTarget,
  getPendingAttachmentUploads,
  normalizeAttachments,
  type NormalizedAttachment,
  resolveLeaveApplicationTargets,
} from "./requestLeaveHelper";
import type { LeaveReason } from "../../types/leaves";

interface FormioSubmission {
  data: {
    leaveRequests?: LeaveRequestRow[];
    [key: string]: unknown;
  };
}

interface FormioInstance {
  submission: FormioSubmission;
  submit: () => void;
}

interface LeaveRequestRow {
  leaveType: string;
  reason: string;
  message: string;
  fromDate: string;
  toDate: string;
  file: unknown;
}

interface BulkLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledDates?: {
    date: string;
    statusInfo?: Record<string, unknown>;
  }[];
}

const BulkLeaveModal: React.FC<BulkLeaveModalProps> = ({
  isOpen,
  onClose,
  prefilledDates,
}) => {
  const formRef = useRef<FormioInstance | null>(null);
  const [previewFile, setPreviewFile] = React.useState<{
    url: string;
    name: string;
  } | null>(null);
  const [currentLeaveRequests, setCurrentLeaveRequests] = useState<
    LeaveRequestRow[]
  >([]);

  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);
  const today = new Date().toISOString().split("T")[0];
  const loading = useLoadingOverlay();

  const {
    data: leaveBalanceData,
    isLoading: isLeaveBalanceLoading,
    isFetching: isLeaveBalanceFetching,
    isError: isLeaveBalanceError,
  } = useGetLeaveBalance(currentEmployee?.name, today);

  const {
    data: reasons,
    isLoading: isReasonLoading,
    isFetching: isReasonFetching,
    isError: isReasonError,
  } = useGetLeaveReason();

  const leaveTypeOptions = useMemo(() => {
    if (!leaveBalanceData?.leave_balance) return [];
    return leaveBalanceData.leave_balance
      .filter((entry) => entry.dont_show_in_frontend === 0)
      .map((entry) => ({
        label: entry.type,
        value: entry.leave_id,
      }));
  }, [leaveBalanceData]);

  const reasonOptions = useMemo(() => {
    return (
      reasons?.map((reason: LeaveReason) => ({
        label: reason.reason,
        value: reason.name,
      })) || []
    );
  }, [reasons]);

  const createLeaveBatchMutation = useCreateLeaveApplicationBatch();
  const { uploadFiles, loading: isUploadingFiles } = useFileUploader();
  const isOptionsLoading =
    !currentEmployee?.name ||
    isLeaveBalanceLoading ||
    isLeaveBalanceFetching ||
    isReasonLoading ||
    isReasonFetching;
  const hasOptionsError = isLeaveBalanceError || isReasonError;
  const hasRequiredOptions =
    leaveTypeOptions.length > 0 && reasonOptions.length > 0;
  const isSubmitDisabled =
    createLeaveBatchMutation.isPending ||
    isUploadingFiles ||
    isOptionsLoading ||
    hasOptionsError ||
    !hasRequiredOptions;

  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const fileContainer = target.closest(".formio-component-file");
      if (!fileContainer || !formRef.current) return;

      const isFileLink = target.closest('a[ref="fileLink"]');

      // Ignore if not clicking the link, or if clicking remove button
      if (
        !isFileLink ||
        target.closest('[ref="removeLink"]') ||
        target.closest(".fa-times")
      )
        return;

      e.preventDefault();
      e.stopPropagation();

      const submission = formRef.current.submission;
      const leaveRequests = submission?.data?.leaveRequests || [];

      // Determine which row was clicked
      const rowElement = target.closest('[ref="row"]');
      let rowIndex = -1;
      if (rowElement && rowElement.parentElement) {
        rowIndex = Array.from(rowElement.parentElement.children).indexOf(
          rowElement,
        );
      }

      let targetFileObj: NormalizedAttachment | null = null;

      if (rowIndex >= 0 && leaveRequests[rowIndex]) {
        const rowFiles = normalizeAttachments(leaveRequests[rowIndex].file);
        if (rowFiles.length > 0) {
          targetFileObj = rowFiles[0];
        }
      } else {
        // Fallback: search by text content matching file name
        const text = fileContainer.textContent || "";
        for (const row of leaveRequests) {
          const normalizedRowFiles = normalizeAttachments(row.file);
          const found = normalizedRowFiles.find(
            (file) => file.name && text.includes(file.name),
          );
          if (found) {
            targetFileObj = found;
            break;
          }
        }
      }

      if (targetFileObj) {
        const fileName = targetFileObj.name || "preview";
        if (
          targetFileObj.url &&
          typeof targetFileObj.url === "string" &&
          !targetFileObj.url.startsWith("blob:")
        ) {
          setPreviewFile({ url: targetFileObj.url, name: fileName });
        } else if (targetFileObj.file instanceof File) {
          const objectUrl = URL.createObjectURL(targetFileObj.file);
          setPreviewFile({ url: objectUrl, name: fileName });
        } else {
          console.log("Could not resolve file URL for preview", targetFileObj);
        }
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => {
      document.removeEventListener("click", handleGlobalClick, true);
    };
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setCurrentLeaveRequests([]);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleScroll = React.useCallback(() => {
    const openDropdowns = document.querySelectorAll(
      ".choices.is-open, .flatpickr-calendar.open",
    );
    if (openDropdowns.length > 0) {
      if (
        document.activeElement &&
        document.activeElement instanceof HTMLElement
      ) {
        document.activeElement.blur();
      }
      // Forcefully remove classes for Choices.js
      openDropdowns.forEach((el) => {
        el.classList.remove("is-open", "is-focused");
        const list = el.querySelector(".choices__list--dropdown");
        if (list) {
          list.classList.remove("is-active");
          list.setAttribute("aria-expanded", "false");
        }
      });
    }
  }, []);

  const leaveForm = useMemo(() => {
    return {
      components: [
        {
          type: "datagrid",
          key: "leaveRequests",
          label: "Leave Requests",
          hideLabel: true,
          addAnotherPosition: "bottom",
          defaultValue:
            prefilledDates && prefilledDates.length > 0
              ? prefilledDates.map((item) => ({
                  fromDate: item.date.split("T")[0],
                  toDate: item.date.split("T")[0],
                }))
              : [{}, {}],
          components: [
            {
              type: "select",
              key: "leaveType",
              label: "Leave Type",
              placeholder: "Select Leave Type...",
              data: { values: leaveTypeOptions },
              validate: { required: true },
            },
            {
              type: "select",
              key: "reason",
              label: "Reason",
              placeholder: "Select Reason...",
              data: { values: reasonOptions },
              validate: { required: true },
            },
            {
              type: "textfield",
              key: "message",
              label: "Message",
              placeholder: "Enter message...",
            },
            {
              type: "datetime",
              key: "fromDate",
              label: "From Date",
              placeholder: "Select From Date",
              enableDate: true,
              enableTime: false,
              format: "dd-MM-yyyy",
              widget: {
                type: "calendar",
                displayInModal: false,
                language: "en",
                useLocaleSettings: false,
                allowInput: true,
                mode: "single",
                enableTime: false,
                noCalendar: false,
                format: "dd-MM-yyyy",
              },
              disabled: !!prefilledDates?.length,
            },
            {
              type: "datetime",
              key: "toDate",
              label: "To Date",
              placeholder: "Select To Date",
              enableDate: true,
              enableTime: false,
              format: "dd-MM-yyyy",
              widget: {
                type: "calendar",
                displayInModal: false,
                language: "en",
                useLocaleSettings: false,
                allowInput: true,
                mode: "single",
                enableTime: false,
                noCalendar: false,
                format: "dd-MM-yyyy",
              },
              disabled: !!prefilledDates?.length,
            },
            {
              type: "file",
              key: "file",
              label: "File",
              storage: "customfiles",
              multiple: true,
            },
          ],
        },
      ],
    };
  }, [leaveTypeOptions, prefilledDates, reasonOptions]);

  const applyToAll = () => {
    if (formRef.current) {
      const submission = formRef.current.submission;
      const leaveRequests = submission?.data?.leaveRequests;
      if (leaveRequests && leaveRequests.length > 0) {
        const firstRow = leaveRequests[0];
        const newLeaveRequests = leaveRequests.map((row: LeaveRequestRow) => ({
          ...row,
          leaveType: firstRow.leaveType,
          reason: firstRow.reason,
          message: firstRow.message,
          file: firstRow.file,
        }));
        formRef.current.submission = {
          ...submission,
          data: {
            ...submission.data,
            leaveRequests: newLeaveRequests,
          },
        };
      }
    }
  };

  const handleReplace = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  const handleFormSubmit = async (submission: FormioSubmission) => {
    if (isOptionsLoading) {
      toast.error("Leave Application form is loading.");
      return;
    }

    if (hasOptionsError) {
      toast.error("Failed to load Leave Application form. Please try again.");
      return;
    }

    if (!hasRequiredOptions) {
      toast.error("Leave types or reasons are not available yet.");
      return;
    }

    const leaveRequests = submission.data?.leaveRequests;
    if (!leaveRequests || leaveRequests.length === 0) {
      toast.error("No leave requests to submit");
      return;
    }

    if (!currentEmployee?.name) {
      toast.error("Employee data not loaded.");
      return;
    }

    const preparedRequests = leaveRequests.map((row, index) => {
      const liveRow = currentLeaveRequests[index];

      return {
        index,
        row,
        pendingUploads: getPendingAttachmentUploads(
          normalizeAttachments(liveRow?.file, row.file),
        ),
      };
    });

    const payload = {
      applications: leaveRequests.map((row) => ({
        employee: currentEmployee.name,
        leave_type: row.leaveType,
        from_date: row.fromDate?.split("T")[0],
        to_date: row.toDate?.split("T")[0],
        description: row.message,
        custom_reason: row.reason,
        custom_attachment: "",
        half_day: 0,
        custom_half_day_type: "",
      })),
    };

    try {
      const attachmentUploadResults = await loading.wrap(async () => {
        const response = await createLeaveBatchMutation.mutateAsync(payload);
        const createdTargets = resolveLeaveApplicationTargets(response);

        return Promise.all(
          preparedRequests.map(async ({ index, row, pendingUploads }) => {
            if (pendingUploads.length === 0) {
              return true;
            }

            const target =
              createdTargets[index] ||
              (await findRecentLeaveApplicationTarget({
                employee: currentEmployee.name,
                leaveType: row.leaveType,
                fromDate: row.fromDate?.split("T")[0],
                toDate: row.toDate?.split("T")[0],
              }));

            if (!target) {
              return false;
            }

            const uploadedFiles = await uploadFiles(
              pendingUploads,
              target.doctype,
              target.docname,
            );

            return uploadedFiles.length === pendingUploads.length;
          }),
        );
      }, "Submitting Leave Request...");

      const hasAttachmentFailures = attachmentUploadResults.some(
        (result) => !result,
      );

      if (hasAttachmentFailures) {
        toast.error(
          "Leave requests were submitted, but some attachments could not be attached.",
        );
      } else {
        toast.success("Leave requests submitted successfully!");
      }
      onClose();
    } catch (err: unknown) {
      const formatted = errorResponseFormater(
        err,
        "Failed to Submit Leave Requests",
      );
      toast.error(formatted);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-primary">Request Leave</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={applyToAll}
              className="flex items-center gap-2 text-sm text-primary border-gray-200 hover:bg-primary/5"
            >
              <Copy className="w-4 h-4" />
              Apply First Row to All
            </Button>
          </div>

          <div className="pb-4 overflow-x-auto" onScroll={handleScroll}>
            <style>
              {`
                .hide-add-row-btn .formio-button-add-row,
                .hide-add-row-btn [ref="addRow"],
                .hide-add-row-btn .datagrid-add {
                  display: none !important;
                }
              `}
            </style>
            {isOptionsLoading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
                  <span>Loading leave types and reasons...</span>
                </div>
              </div>
            ) : hasOptionsError ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-red-100 bg-red-50 px-6 text-center text-sm text-red-600">
                Failed to load leave types or reasons. Please close this modal
                and try again.
              </div>
            ) : !hasRequiredOptions ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-amber-100 bg-amber-50 px-6 text-center text-sm text-amber-700">
                Leave types or reasons are not available for this employee right
                now.
              </div>
            ) : (
              <div className="w-[1600px] hide-add-row-btn">
                <Form
                  form={leaveForm}
                  onFormReady={(instance: FormioInstance) => {
                    formRef.current = instance;
                  }}
                  onChange={(change: FormioSubmission) => {
                    const changedLeaveRequests = change.data?.leaveRequests;
                    if (Array.isArray(changedLeaveRequests)) {
                      setCurrentLeaveRequests(changedLeaveRequests);
                    } else if (!changedLeaveRequests) {
                      setCurrentLeaveRequests([]);
                    }
                  }}
                  onSubmit={handleFormSubmit}
                  options={{
                    builder: { styles: false },
                    submitButton: false,
                    alerts: false,
                    validateOnInit: false,
                    validateOnBlur: true,
                    validateOnChange: false,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8f9fe] border-t border-gray-100 px-6 py-4 flex justify-end gap-3 mt-auto">
          <Button
            onClick={onClose}
            variant="outline"
            className="!border-gray-300 !text-gray-600 bg-white hover:bg-gray-50 px-6 py-2 h-auto text-sm font-medium rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleReplace}
            disabled={isSubmitDisabled}
            variant="contain"
            className="!bg-primary hover:opacity-90 px-6 py-2 h-auto text-sm font-medium rounded-lg text-white border-0"
          >
            {createLeaveBatchMutation.isPending || isUploadingFiles
              ? "Submitting..."
              : "Submit Request"}
          </Button>
        </div>
      </div>

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

export default BulkLeaveModal;
