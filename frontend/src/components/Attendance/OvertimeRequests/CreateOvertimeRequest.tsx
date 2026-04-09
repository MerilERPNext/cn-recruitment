/* eslint-disable @typescript-eslint/no-explicit-any */
import { X, Trash2 } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import "../../../formio.custom.css";
import {
  useCreatePlannedOvertimeRequest,
  usePlannedOvertimeRequestAttachments,
  useUpdatePlannedOvertimeRequest,
} from "../../../hooks/useAttendance";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { format, isValid, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { CustomError } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import overtimeRequestSchema from "./overtimeRequestSchema.json";
import Button from "../../shared/atoms/Button";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { useRequiredFields } from "../../../hooks/useRequiredFields";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { Typography } from "../../shared/atoms/Typography";

interface RequestOvertimeProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
  editData?: {
    name: string;
    overtime_details: any[];
    attachments?: any[];
  };
  isEditMode?: boolean;
}

interface SchemaComponent {
  type: string;
  key: string;
  label?: string;
  components?: SchemaComponent[];
  data?: {
    values?: RequestTypeOption[];
    url?: string;
  };
  dataSrc?: string;
  valueProperty?: string;
  selectValues?: string;
  refreshOn?: string;
  // allow other unknown properties like validate
  [key: string]: any;
}
interface RequestTypeOption {
  label: string;
  value: string;
}

interface FormSchema {
  title: string;
  name: string;
  path: string;
  display: string;
  components: SchemaComponent[];
}

const transformSchemaWithRequired = (
  baseSchema: FormSchema,
  requiredMap: Record<string, boolean>,
  isEditMode: boolean = false,
  hasExistingAttachments: boolean = false,
): FormSchema => {
  if (!baseSchema) return baseSchema;
  const cloned = JSON.parse(JSON.stringify(baseSchema)) as FormSchema;

  const applyToComponents = (components?: SchemaComponent[]) => {
    if (!components) return;
    components.forEach((comp: SchemaComponent) => {
      const key = comp.key;

      // Handle attachment field specially in edit mode
      if (key === "attachment" && isEditMode && hasExistingAttachments) {
        // Don't make attachment required in edit mode if there are existing attachments
        if (comp.validate) {
          comp.validate.required = false;
        }
        // Remove the asterisk from label if it exists
        if (typeof comp.label === "string") {
          const asteriskHtml =
            "<span style='color:red;margin-left:3px;'> *</span>";
          comp.label = comp.label.replace(asteriskHtml, "");
        }
      } else if (key && requiredMap[key]) {
        if (!comp.validate) comp.validate = {};
        comp.validate.required = true;

        if (typeof comp.label === "string") {
          const asteriskHtml =
            "<span style='color:red;margin-left:3px;'> *</span>";
          if (!comp.label.includes(asteriskHtml)) {
            comp.errorLabel = comp.label;
            comp.label = `${comp.label} ${asteriskHtml}`;

          }
        }
      }

      // Only apply minDate validation when NOT in edit mode
      if (!isEditMode && (key === "start_date" || key === "end_date")) {
        if (!comp.datePicker) comp.datePicker = {};
        comp.datePicker.minDate = format(new Date(), "yyyy-MM-dd");
      }
      // recurse into nested components (like panels, columns, containers)
      if (comp.components && Array.isArray(comp.components)) {
        applyToComponents(comp.components);
      }
      // some schema use nested components in 'columns' or 'rows' etc - handle common cases
      if (comp.columns && Array.isArray(comp.columns)) {
        comp.columns.forEach((col: any) => applyToComponents(col.components));
      }
      if (comp.rows && Array.isArray(comp.rows)) {
        comp.rows.forEach((row: any[]) =>
          row.forEach((cell: any) => applyToComponents(cell.components)),
        );
      }
    });
  };

  applyToComponents(cloned.components);
  return cloned;
};

const CreateOvertimeRequest = ({ onCancel, editData, isEditMode }: RequestOvertimeProps) => {
  const formInstance = useRef<any>(null);
  const initialSubmissionSet = useRef(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>(
    editData?.attachments || []
  );
  const { setRefetchAttendance } = useGlobalStore();
  const { isDesktop } = useScreenSize();

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string,
    undefined,
    ["employee"],
  );
  const { targetEmployeeId } = useTargetUser();
  const { uploadFiles, loading: uploadFileLoading } = useFileUploader();

  const createMutation = useCreatePlannedOvertimeRequest();
  const updateMutation = useUpdatePlannedOvertimeRequest();
  const mutation = isEditMode ? updateMutation : createMutation;
  const { data: plannedOvertimeRequestAttachments } =
    usePlannedOvertimeRequestAttachments(
      targetEmployeeId || currentEmployee?.employee || "",
    );

  /** Memoized initial value to avoid rerender resets */
  const initialSubmissionData = useMemo(() => {
    const baseData: any = {
      show_attachment: !!plannedOvertimeRequestAttachments,
    };

    // If in edit mode, prefill the form with existing data
    if (isEditMode && editData?.overtime_details) {
      baseData.overtime_details = editData.overtime_details.map((detail: any) => {
        // Convert time string (HH:mm:ss) to a datetime string that Formio can understand
        const convertTimeToDateTime = (timeStr: string, dateStr: string) => {
          if (!timeStr || !dateStr) return "";
          try {
            // Parse the date string
            const date = parseISO(dateStr);
            // Split time string (HH:mm:ss)
            const [hours, minutes, seconds] = timeStr.split(':');
            // Create a new date with the time
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            date.setSeconds(seconds ? parseInt(seconds, 10) : 0);
            return date.toISOString();
          } catch (e) {
            console.error("Error converting time:", e);
            return "";
          }
        };

        return {
          start_date: detail.start_date,
          end_date: detail.end_date,
          start_time: convertTimeToDateTime(detail.start_time, detail.start_date),
          end_time: convertTimeToDateTime(detail.end_time, detail.end_date),
          message: detail.message || "",
        };
      });
    }

    return { data: baseData };
  }, [plannedOvertimeRequestAttachments, isEditMode, editData]);

  const isValidDate = (dateString: string) => {
    try {
      const parsed = parseISO(dateString);
      return isValid(parsed);
    } catch {
      return false;
    }
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "yyyy-MM-dd");
  };

  const { data: requiredFieldsChild } = useRequiredFields(
    "Overtime Child table",
  );
  const { data: requiredFieldsParent } = useRequiredFields(
    "Planned Overtime Request",
  );

  const requiredFieldMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (requiredFieldsChild?.fields) {
      requiredFieldsChild.fields.forEach((f) => {
        if (f.fieldname) map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
      });
    }
    if (requiredFieldsParent?.fields) {
      requiredFieldsParent.fields.forEach((f) => {
        if (f.fieldname && f.fieldname != "overtime_details")
          map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
      });
    }

    // Attachment is mandatory if plannedOvertimeRequestAttachments is true
    if (plannedOvertimeRequestAttachments) {
      map["attachment"] = true;
    }

    return map;
  }, [
    requiredFieldsChild,
    requiredFieldsParent,
    plannedOvertimeRequestAttachments,
  ]);

  console.log("requiredFieldMap", requiredFieldMap);

  const handleRemoveExistingAttachment = (index: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const loading = useLoadingOverlay();
  const handleSubmit = async () => {
    await loading?.wrap(async () => {
      try {
        const submission = await formInstance.current?.submit();
        const data = submission?.data;

        const formattedOvertimeDetails = data?.overtime_details?.map(
          (entry: any) => ({
            shift_date: isValidDate(entry.start_date)
              ? formatDate(entry.start_date)
              : entry.start_date,
            start_date: isValidDate(entry.start_date)
              ? formatDate(entry.start_date)
              : entry.start_date,
            end_date: isValidDate(entry.end_date)
              ? formatDate(entry.end_date)
              : entry.end_date,
            start_time: format(new Date(entry?.start_time), "HH:mm:ss"),
            end_time: format(new Date(entry?.end_time), "HH:mm:ss"),
            message: entry?.message,
          }),
        );

        await new Promise<void>((resolve, reject) => {
          const payload = isEditMode
            ? {
              name: editData?.name || "",
              data: {
                overtime_details: formattedOvertimeDetails || [],
                // Send remaining existing attachments
                attachments: existingAttachments.map(att => ({
                  file_url: att.file_url,
                  file_name: att.file_name,
                })),
              },
            }
            : {
              employee: currentEmployee?.employee || "",
              overtime_details: formattedOvertimeDetails || [],
            };

          mutation.mutate(
            payload,
            {
              onSuccess: async (data: any) => {
                const onFinish = () => {
                  setAttachments([]);
                  setExistingAttachments([]);
                  onCancel?.();
                  setTimeout(() => setRefetchAttendance(true), 1000);
                };

                if (attachments?.length > 0) {
                  const docName = isEditMode ? editData?.name : data.name;
                  await uploadFiles(
                    attachments,
                    data.doctype || "Planned Overtime Request",
                    docName,
                    onFinish,
                  );
                } else {
                  onFinish();
                }

                resolve();
                toast.success(isEditMode ? "Overtime Request Updated Successfully" : "Overtime Request Created Successfully");
              },
              onError: (e: CustomError) => {
                const formattedError = errorResponseFormater(
                  e,
                  "Request Failed",
                );
                toast.error(formattedError);
                console.error(e);
                reject(e);
              },
            },
          );
        });
      } catch (err) {
        toast.error("Please fill in all required fields.");
        console.warn("Form submission error -", err);
        throw err;
      }
    }, "Submitting overtime request…");
  };

  // Sync show_attachment if it changes after initial load
  useEffect(() => {
    if (
      formInstance.current &&
      plannedOvertimeRequestAttachments !== undefined
    ) {
      const showAttachmentComp =
        formInstance.current.getComponent("show_attachment");
      if (showAttachmentComp) {
        showAttachmentComp.setValue(!!plannedOvertimeRequestAttachments, {
          noUpdateEvent: true,
        });
      }
    }
  }, [plannedOvertimeRequestAttachments]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.();
          setAttachments([]);
          setExistingAttachments([]);
        }
      }}
    >
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditMode ? "Edit Overtime Request" : "Planned Overtime Request"}
          </h2>
          {isDesktop && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.();
                setAttachments([]);
                setExistingAttachments([]);
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Form.io Form */}
        <div className="flex-1 min-h-0 p-2 md:px-6 md:py-4 overflow-y-auto overtime-request-form pb-20">

          <Form
            form={useMemo(
              () =>
                transformSchemaWithRequired(
                  overtimeRequestSchema,
                  requiredFieldMap,
                  isEditMode,
                  !!(isEditMode && existingAttachments.length > 0),
                ),
              [requiredFieldMap, isEditMode, existingAttachments.length],
            )}
            onChange={useCallback(
              (submission: any) => {
                const changed = submission?.changed;
                if (changed?.component?.key === "attachment") {
                  setAttachments(submission?.data?.attachment || []);
                }

                // Auto-populate end_date from start_date
                if (
                  changed?.component?.key === "start_date" &&
                  changed?.value &&
                  changed?.instance?.rowIndex !== undefined
                ) {
                  const rowIndex = changed.instance.rowIndex;
                  // Get the grid component
                  const grid =
                    formInstance.current?.getComponent("overtime_details");

                  // Check if grid and row exist, then set value
                  if (grid?.rows?.[rowIndex]?.end_date) {
                    // Use setValue with noUpdateEvent to avoid triggering another change loop if possible
                    // or just setValue. Formio usually handles this well.
                    grid.rows[rowIndex].end_date.setValue(changed.value);
                  }
                }
              },
              [onCancel, setRefetchAttendance, setAttachments],
            )}
            /** CRITICAL FIX: Do NOT pass submission prop */
            onFormReady={(instance: any) => {
              formInstance.current = instance;
              if (!initialSubmissionSet.current) {
                instance?.setSubmission?.(initialSubmissionData);
                initialSubmissionSet.current = true;
              }
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              clearOnSubmit: false,
              formClass: "space-y-6",
              rowClass: "flex flex-col md:flex-row md:space-x-4",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
              validateOnInit: !isEditMode,
              validateOnBlur: true,
              validateOnChange: false,
            }}
          />
          {isEditMode && existingAttachments.length > 0 && (
            <div className="my-2 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <Typography variant="bodySmall" className="font-semibold mb-3">
                Existing Attachments ({existingAttachments.length})
              </Typography>
              <div className="space-y-2">
                {existingAttachments.map((attachment, index) => (
                  <div
                    key={attachment.file_url || index}
                    className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded"
                  >
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex-1 truncate"
                    >
                      {attachment.file_name || attachment.file_url?.split('/').pop() || `Attachment ${index + 1}`}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingAttachment(index)}
                      className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      aria-label="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex flex-row md:flex-row gap-3 md:gap-4 md:justify-end">
            {!isDesktop && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel?.();
                  setAttachments([]);
                  setExistingAttachments([]);
                }}
                size="md"
                variant="outline"
                bgColor="primary"
                className="w-full md:w-auto min-w-[150px]"
              >
                Cancel
              </Button>
            )}

            <Button
              onClick={handleSubmit}
              disabled={mutation?.isPending}
              size="md"
              variant="contain"
              bgColor="primary"
              className="w-full md:w-auto min-w-[150px]"
            >
              {mutation?.isPending || uploadFileLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                isEditMode ? "Update" : "Submit"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOvertimeRequest;
