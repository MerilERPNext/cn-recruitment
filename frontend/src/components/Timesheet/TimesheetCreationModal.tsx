import type React from "react";
import { useRef, useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { Form } from "@tsed/react-formio";
import { timesheetSchema } from "./timesheetSchema";
import { useCreateTimesheet, useTimesheetSettings } from "../../hooks/useTimesheet";
import Button from "../shared/atoms/Button";
import { TimesheetFormData, TimesheetDetail } from "../../types/timesheet";
import { useMemo } from "react";

interface FormioComponentInstance {
  setValue: (val: unknown, flags?: { modified?: boolean; noUpdateEvent?: boolean;[key: string]: unknown }) => void;
  dataValue?: unknown;
  updateItems: (value: unknown, flag: boolean) => void;
  redraw: () => void;
  triggerUpdate: () => void;
  parent?: {
    getComponent?: (key: string) => FormioComponentInstance | undefined;
  };
}

interface FormioEvent {
  changed?: {
    component?: {
      key: string;
    };
    instance?: FormioComponentInstance;
  };
}

interface FormioInstance {
  submit: () => Promise<void>;
  on: (event: string, callback: (e: FormioEvent) => void) => void;
  off: (event: string, callback: (e: FormioEvent) => void) => void;
  getComponent: (key: string) => FormioComponentInstance | undefined;
}

interface TimesheetCreationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const TimesheetCreationModal: React.FC<TimesheetCreationModalProps> = ({ onClose, onSuccess }) => {
  const { mutate: createTimesheet, isPending: isSubmitting } = useCreateTimesheet();
  const { data: timesheetSettingsData, isLoading: isSettingsLoading } = useTimesheetSettings();
  const showSubtask = timesheetSettingsData ? Number(timesheetSettingsData.show_subtask) === 1 : true;

  const formSchema = useMemo(() => {
    const schema = JSON.parse(JSON.stringify(timesheetSchema));
    if (!showSubtask) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const timeLogsComp = schema.components.find((c: any) => c.key === "time_logs");
      if (timeLogsComp && timeLogsComp.components) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row3 = timeLogsComp.components.find((c: any) => c.columns && c.columns.some((col: any) => col.components.some((comp: any) => comp.key === "custom_parent_task")));
        if (row3) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const taskCol = row3.columns.find((col: any) => col.components.some((comp: any) => comp.key === "custom_parent_task"));
          if (taskCol) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            taskCol.components = taskCol.components.filter((c: any) => c.key !== "task");
          }
        }
      }
    }
    return schema;
  }, [showSubtask]);

  const formInstance = useRef<FormioInstance | null>(null);
  const [formReadyInstance, setFormReadyInstance] = useState<FormioInstance | null>(null);

  useEffect(() => {
    if (!formReadyInstance) return;

    const handleChange = (event: FormioEvent) => {
      if (event.changed?.component?.key !== "project") return;

      const taskComponent =
        event.changed.instance?.parent?.getComponent?.("task");

      if (!taskComponent) return;

      // Clear task immediately
      taskComponent.setValue(null, {
        modified: true,
        noUpdateEvent: false,
      });

      taskComponent.dataValue = null;

      // Then reload options after project value is committed
      setTimeout(() => {
        taskComponent.updateItems?.(null, true);
        taskComponent.redraw();
      }, 50);
    };

    formReadyInstance.on("change", handleChange);

    return () => {
      formReadyInstance.off("change", handleChange);
    };
  }, [formReadyInstance]);

  const handleCustomSubmit = async () => {
    try {
      await formInstance.current?.submit();
    } catch {
      toast.error("Please fill in all required fields.");
    }
  };

  const formatFrappeDatetime = (dateString: string) => {
    if (!dateString) return dateString;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handleFormSubmit = (submission: { data: TimesheetFormData }) => {
    const data = submission.data;

    if (!data.time_logs || data.time_logs.length === 0) {
      toast.error("Please add at least one timesheet entry.");
      return;
    }

    // Formatting time_logs for frappe
    const formattedData = {
      company: data.company || "",
      employee: data.employee || window.target_pw_user_id || "",
      project: data.parent_project,
      customer: data.customer,
      time_logs: data.time_logs.map((log: TimesheetDetail) => {
        const taskPayload = showSubtask
          ? {
              task: log.task,
              custom_parent_task: log.custom_parent_task,
            }
          : {
              custom_parent_task: log.custom_parent_task || log.task,
            };

        return {
          activity_type: log.activity_type,
          project: log.project,
          ...taskPayload,
          expected_hours: log.expected_hours,
          from_time: formatFrappeDatetime(log.from_time),
          to_time: formatFrappeDatetime(log.to_time),
          description: log.description,
          hours: log.hours,
          completed: log.completed ? 1 : 0,
          is_billable: log.is_billable ? 1 : 0,
        };
      })
    };

    createTimesheet(formattedData, {
      onSuccess: () => {
        toast.success("Timesheet created successfully");
        onSuccess();
        onClose();
      },
      onError: (error) => {
        toast.error(errorResponseFormater(error, "Failed to create timesheet"));
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-0 sm:p-4">
      <div className="relative w-full h-full sm:h-auto max-w-4xl bg-white sm:rounded-lg shadow-xl sm:my-8 flex flex-col max-h-screen sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h3 className="text-xl font-semibold text-gray-900">Create Timesheet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="show-req-astrik p-6 overflow-y-auto flex-1 timesheet-form pb-20">
          {isSettingsLoading ? (
            <div className="flex justify-center items-center h-40">
              <span className="inline-block w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <Form
              form={formSchema}
              onSubmit={handleFormSubmit}
              onFormReady={(instance: FormioInstance) => {
                formInstance.current = instance;
                setFormReadyInstance(instance);
              }}
              options={{
                buttonSettings: {
                  showSubmit: false
                }
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="fixed md:absolute bottom-0 right-0 w-full bg-white py-4 px-6 z-50 border-t border-gray-200 flex justify-end gap-4">
          <Button
            onClick={onClose}
            size="md"
            variant="outline"
            bgColor="primary"
            className="w-full md:w-auto min-w-[150px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCustomSubmit}
            disabled={isSubmitting}
            size="md"
            variant="contain"
            bgColor="primary"
            className="w-full md:w-auto min-w-[150px]"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimesheetCreationModal;

