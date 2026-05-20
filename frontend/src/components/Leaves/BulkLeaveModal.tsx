import React, { useMemo, useRef } from 'react';
import { X, Copy } from 'lucide-react';
import Button from '../shared/atoms/Button';
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { FilePreviewModal } from "../shared/molecules/FilePreviewModal";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import { useGetLeaveBalance, useGetLeaveReason } from "../../hooks/useLeaves";

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

const BulkLeaveModal: React.FC<BulkLeaveModalProps> = ({ isOpen, onClose, prefilledDates }) => {
  const formRef = useRef<FormioInstance | null>(null);
  const [previewFile, setPreviewFile] = React.useState<{ url: string; name: string } | null>(null);

  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);
  const today = new Date().toISOString().split("T")[0];

  const { data: leaveBalanceData } = useGetLeaveBalance(
    currentEmployee?.name,
    today,
  );

  const { data: reasons } = useGetLeaveReason();

  const leaveTypeOptions = useMemo(() => {
    if (!leaveBalanceData?.leave_balance) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return leaveBalanceData.leave_balance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((entry: any) => entry.dont_show_in_frontend === 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((entry: any) => ({
        label: entry.type,
        value: entry.leave_id,
      }));
  }, [leaveBalanceData]);

  const reasonOptions = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return reasons?.map((reason: any) => ({
      label: reason.reason,
      value: reason.name
    })) || [];
  }, [reasons]);


  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const fileContainer = target.closest('.formio-component-file');
      if (!fileContainer || !formRef.current) return;

      const isFileLink = target.closest('a[ref="fileLink"]');

      // Ignore if not clicking the link, or if clicking remove button
      if (!isFileLink || target.closest('[ref="removeLink"]') || target.closest('.fa-times')) return;

      e.preventDefault();
      e.stopPropagation();

      const submission = formRef.current.submission;
      const leaveRequests = submission?.data?.leaveRequests || [];

      // Determine which row was clicked
      const rowElement = target.closest('[ref="row"]');
      let rowIndex = -1;
      if (rowElement && rowElement.parentElement) {
        rowIndex = Array.from(rowElement.parentElement.children).indexOf(rowElement);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let targetFileObj: any = null;

      if (rowIndex >= 0 && leaveRequests[rowIndex]) {
        const rowFiles = leaveRequests[rowIndex].file;
        if (Array.isArray(rowFiles) && rowFiles.length > 0) {
          targetFileObj = rowFiles[0];
        }
      } else {
        // Fallback: search by text content matching file name
        const text = fileContainer.textContent || '';
        for (const row of leaveRequests) {
          if (Array.isArray(row.file)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const found = row.file.find((f: any) => f.name && text.includes(f.name));
            if (found) {
              targetFileObj = found;
              break;
            }
          }
        }
      }

      if (targetFileObj) {
        const fileName = targetFileObj.name || 'preview';
        if (targetFileObj.url && typeof targetFileObj.url === 'string' && !targetFileObj.url.startsWith('blob:')) {
          setPreviewFile({ url: targetFileObj.url, name: fileName });
        } else if (targetFileObj.file instanceof File) {
          const objectUrl = URL.createObjectURL(targetFileObj.file);
          setPreviewFile({ url: objectUrl, name: fileName });
        } else {
          console.log("Could not resolve file URL for preview", targetFileObj);
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleScroll = React.useCallback(() => {
    const openDropdowns = document.querySelectorAll('.choices.is-open, .flatpickr-calendar.open');
    if (openDropdowns.length > 0) {
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Forcefully remove classes for Choices.js
      openDropdowns.forEach(el => {
        el.classList.remove('is-open', 'is-focused');
        const list = el.querySelector('.choices__list--dropdown');
        if (list) {
          list.classList.remove('is-active');
          list.setAttribute('aria-expanded', 'false');
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
          disableAddingRemovingRows: true,
          defaultValue: prefilledDates && prefilledDates.length > 0
            ? prefilledDates.map(item => ({
              fromDate: item.date.split('T')[0],
              toDate: item.date.split('T')[0]
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
            }
          ]
        }
      ]
    };
  }, [prefilledDates]);

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
            leaveRequests: newLeaveRequests
          }
        };
      }
    }
  };

  const handleReplace = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  const handleFormSubmit = (submission: FormioSubmission) => {
    console.log("================= FINAL SUBMISSION PAYLOAD =================");
    console.log(JSON.stringify(submission.data, null, 2));
    console.log("==========================================================");
    onClose();
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
            <Button size="sm" variant="outline" onClick={applyToAll} className="flex items-center gap-2 text-sm text-primary border-gray-200 hover:bg-primary/5">
              <Copy className="w-4 h-4" />
              Apply First Row to All
            </Button>
          </div>

          <div className="pb-4 overflow-x-auto" onScroll={handleScroll}>
            <div className="w-[1600px]">
              <Form
                form={leaveForm}
                onFormReady={(instance: FormioInstance) => {
                  formRef.current = instance;
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
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8f9fe] border-t border-gray-100 px-6 py-4 flex justify-end gap-3 mt-auto">
          <Button onClick={onClose} variant="outline" className="!border-gray-300 !text-gray-600 bg-white hover:bg-gray-50 px-6 py-2 h-auto text-sm font-medium rounded-lg">
            Cancel
          </Button>
          <Button onClick={handleReplace} variant="contain" className="!bg-primary hover:opacity-90 px-6 py-2 h-auto text-sm font-medium rounded-lg text-white border-0">
            Submit Request
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
