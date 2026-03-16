/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css";
import {
  useAttendanceRequestAttachments,
  useCreateNewAttendanceRequest,
  useGetEmployeeShift,
  useGetUserRoles,
  useReqValidationsForAttendanceRequest,
  useUpdateAttendanceRequest,
  useAllEmployeeCheckIns,
} from "../../../hooks/useAttendance";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import { endOfDay, format, isValid, startOfDay } from "date-fns";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { toast } from "react-hot-toast";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { X } from "lucide-react";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { MyAttendanceRequest } from "../../../types/attendance";
// Import the JSON schema
import defaultFormSchema from "./attendanceRequestFormSchema.json";
import Button from "../../shared/atoms/Button";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { useRequiredFields } from "../../../hooks/useRequiredFields";
import {
  GenericFormSchema,
  transformSchemaWithRequired,
} from "../../../utils/transformSchemaWithRequired";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useQueryClient } from "@tanstack/react-query";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";

interface AttendanceFormData {
  request_type?: string;
  company?: string;
  employee?: {
    name: string;
    employee_name: string;
    company: string;
  };
  explanation?: string;
  custom__request_reason?: string;
  from_date?: string | Date;
  to_date?: string | Date;
  select_shift?: string;
  overnight_out_duty?: boolean;
  attachments?: { url: string }[];
  custom_attachment?: string;
  custom_location?: string;
  isForOthers?: boolean;
  currentEmployeeId?: string;
  currentUserId?: string;
  checkin_time?: string | Date;
  checkout_time?: string | Date;
}

interface FormioComponent {
  disabled: boolean;
  component: FormioComponent | null;
  hidden: boolean;
  setValue: (
    value: string | boolean,
    options?: { noUpdateEvent?: boolean },
  ) => void;
  redraw: () => void;
}

interface FormioFormInstance {
  submit: () => void;
  getValue: () => { data: AttendanceFormData };
  setValue: (value: { data: AttendanceFormData }) => void;
  redraw: () => void;
  getComponent: (key: string) => FormioComponent | null;
  element?: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submission?: any;
}

export interface FormSchema {
  title: string;
  name: string;
  path: string;
  display: string;
  components: SchemaComponent[];
}

export interface SchemaComponent {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface RequestTypeOption {
  label: string;
  value: string;
}

interface FormChangeSubmission {
  changed?: {
    component?: {
      key?: string;
    };
    value: string | Date | boolean | number;
  };
  data?: AttendanceFormData;
}

// Extend HTMLInputElement to include flatpickr properties
interface FlatpickrInput extends HTMLInputElement {
  _flatpickr?: {
    close: () => void;
  };
  __closeOtherFPHandler?: () => void;
}

interface AttendanceRequestFormV2Props {
  onClose: () => void;
  selectedDate?: Date | string;
  schema?: FormSchema;
  schemaUrl?: string;
  defaultAttendanceData?: MyAttendanceRequest | null;
  forActionType?: "create" | "edit";
  latestInAndOutTime?: {
    in_time: string;
    out_time: string;
  };
}

const AttendanceRequestFormV2: React.FC<AttendanceRequestFormV2Props> = ({
  onClose,
  selectedDate: propSelectedDate,
  schema: propSchema,
  schemaUrl,
  defaultAttendanceData,
  forActionType = "create",
  latestInAndOutTime,
}) => {
  const selectedDate = useMemo(() => {
    if (!propSelectedDate) return new Date();
    return propSelectedDate instanceof Date
      ? propSelectedDate
      : new Date(propSelectedDate);
  }, [propSelectedDate]);

  const { setRefetchAttendance } = useGlobalStore();
  const { isDesktop } = useScreenSize();
  const { data: userUiPermission } = useGetUiPermission("Attendance");

  const canCreateAttendanceRequestForOthers = isActionEnabled(
    userUiPermission,
    "create_attendance_request_for_others",
    "Attendance Summary",
  );
  const formAddressInstance = useRef<FormioFormInstance | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [fromDateChanged, setFromDateChanged] = useState<string>("");
  const [toDateChanged, setToDateChanged] = useState<string>("");
  const [requestTypeChanged, setRequestTypeChanged] = useState<string>("");
  const [currentlySelectedEmployee, setCurrentlySelectedEmployee] =
    useState<any>(null);
  const { uploadFiles, loading: uploadFileLoading } = useFileUploader();

  const [isForOthers, setIsForOthers] = useState(false);
  const [formSchema, setFormSchema] = useState<FormSchema>(
    (propSchema || defaultFormSchema) as FormSchema,
  );
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string,
  );
  const { data: userRoles } = useGetUserRoles();

  const shiftFilters = useMemo(
    () => ({
      date: selectedDate,
    }),
    [selectedDate],
  );

  const shiftEmployeeId = isForOthers
    ? typeof currentlySelectedEmployee === "string"
      ? currentlySelectedEmployee
      : currentlySelectedEmployee?.user_id || currentlySelectedEmployee?.name
    : currentEmployee?.user_id || currentUser?.name;

  const { data: shiftData } = useGetEmployeeShift(
    shiftEmployeeId || "",
    shiftFilters,
  );

  const queryClient = useQueryClient();

  const activeEmployeeId =
    currentlySelectedEmployee?.name || currentEmployee?.employee || "";

  const reqValidationmutation =
    useReqValidationsForAttendanceRequest(activeEmployeeId);
  const { data: attendanceRequestAttachmentsMandatory } =
    useAttendanceRequestAttachments(
      activeEmployeeId,
      fromDateChanged ||
      format(selectedDate ? new Date(selectedDate) : new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      requestTypeChanged,
    );
  const mutation = useCreateNewAttendanceRequest();
  const { mutate: updateAttendanceRequest } = useUpdateAttendanceRequest();

  const { data: requiredFields } = useRequiredFields("Attendance Request");
  const requiredFieldMap = useMemo(() => {
    if (!requiredFields?.fields) return {};
    const map: Record<string, boolean> = {};
    requiredFields.fields.forEach((f) => {
      if (f.fieldname) map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
    });
    return map;
  }, [requiredFields]);

  // Fetch schema from backend if schemaUrl is provided
  useEffect(() => {
    if (schemaUrl && !propSchema) {
      setIsSchemaLoading(true);
      fetch(schemaUrl)
        .then((res) => res.json())
        .then((data) => {
          const src = data.message || data;
          try {
            const transformed = transformSchemaWithRequired(
              src,
              requiredFieldMap,
            ) as FormSchema;
            setFormSchema(transformed);
          } catch (e) {
            console.error(e);
            setFormSchema(src);
          } finally {
            setIsSchemaLoading(false);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch schema:", error);
          toast.error("Failed to load form schema");
          setIsSchemaLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaUrl, propSchema, requiredFieldMap]);

  // Update schema when propSchema changes
  useEffect(() => {
    if (propSchema) {
      try {
        setFormSchema(
          transformSchemaWithRequired(
            propSchema as GenericFormSchema,
            requiredFieldMap,
          ) as FormSchema,
        );
      } catch {
        setFormSchema(propSchema);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propSchema, requiredFieldMap]);

  // If requiredFieldMap changes and we already have a formSchema in state, re-apply required flags
  useEffect(() => {
    try {
      setFormSchema((prev) => {
        if (!prev) return prev;
        return transformSchemaWithRequired(
          prev as GenericFormSchema,
          requiredFieldMap,
        ) as FormSchema;
      });
    } catch (e) {
      // ignore transform errors
      console.warn("Failed to reapply required fields to existing schema", e);
    }
  }, [requiredFieldMap]);

  // Filter request types based on API conditions and remove dataSrc from company field
  useEffect(() => {
    if (reqValidationmutation?.data) {
      const baseSchema = propSchema || defaultFormSchema;
      const filteredSchema = JSON.parse(
        JSON.stringify(baseSchema),
      ) as FormSchema; // Deep clone
      // Find the request_type field in the schema
      const panel = filteredSchema.components?.[0];
      if (panel?.components) {
        const requestTypeField = panel.components.find(
          (comp: SchemaComponent) => comp.key === "request_type",
        );

        if (requestTypeField?.data?.values) {
          // Filter options based on API conditions
          const filteredValues = requestTypeField.data.values.filter(
            (option: RequestTypeOption) => {
              switch (option.value) {
                case "Clockin":
                  return reqValidationmutation.data.clockin_requests;
                case "Out Duty":
                  return reqValidationmutation.data.out_duty_requests;
                case "Short Attendance Request":
                  return reqValidationmutation.data.short_leave_requests;
                case "Attendance Adjustment":
                  return reqValidationmutation.data
                    .attendance_adjustment_requests;
                default:
                  return false;
              }
            },
          );

          requestTypeField.data.values = filteredValues;
        }

        // Remove dataSrc from company field to allow manual control
        const companyField = panel.components.find(
          (comp: SchemaComponent) => comp.key === "company",
        );
        if (companyField && companyField.dataSrc) {
          delete companyField.dataSrc;
          delete companyField.data;
          delete companyField.valueProperty;
          delete companyField.selectValues;
          delete companyField.refreshOn;
        }
      }

      try {
        const transformed = transformSchemaWithRequired(
          filteredSchema as GenericFormSchema,
          requiredFieldMap,
        ) as FormSchema;
        setFormSchema(transformed);
      } catch {
        setFormSchema(filteredSchema);
      }
    }
    // include requiredFieldMap so required flags are respected after filtering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqValidationmutation?.data, propSchema, requiredFieldMap]);

  const start = useMemo(() => {
    const d = fromDateChanged ? new Date(fromDateChanged) : selectedDate;
    const validDate = isValid(d) ? d : new Date();
    return format(startOfDay(validDate), "yyyy-MM-dd HH:mm:ss");
  }, [fromDateChanged, selectedDate]);

  const end = useMemo(() => {
    let rawDate = toDateChanged;
    if (!rawDate && fromDateChanged) rawDate = fromDateChanged;

    const d = rawDate ? new Date(rawDate) : selectedDate;
    const validDate = isValid(d) ? d : new Date();
    return format(endOfDay(validDate), "yyyy-MM-dd HH:mm:ss");
  }, [toDateChanged, fromDateChanged, selectedDate]);

  const checkinFilters = useMemo(() => {
    if (!activeEmployeeId) return [];
    return [
      ["time", "between", [start, end]],
      ["employee", "=", activeEmployeeId],
    ];
  }, [start, end, activeEmployeeId]);

  const {
    data: homeSummary,
    isLoading: isHomeSummaryLoading,
    isFetching: isHomeSummaryFetching,
  } = useAllEmployeeCheckIns(checkinFilters as any, {
    enabled: !!activeEmployeeId,
  });

  const normalizeTime = (timeStr?: string) => {
    if (!timeStr) return null;
    try {
      // If it's a datetime string (contains space), extract time portion
      let timePart = timeStr;
      if (timeStr.includes(" ")) {
        timePart = timeStr.split(" ")[1];
      }

      // Parse and format to HH:mm:ss
      const [h, m, s] = timePart.split(":");
      const seconds = s ? s.split(".")[0].padStart(2, "0") : "00";
      return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${seconds}`;
    } catch {
      return null;
    }
  };
  const initialSubmissionSet = useRef(false);
  const initialSubmission = useMemo(
    () => ({
      data: {
        from_date:
          defaultAttendanceData?.reference_document?.from_date || selectedDate,
        to_date:
          defaultAttendanceData?.reference_document?.to_date || selectedDate,
        request_type:
          defaultAttendanceData?.reference_document?.custom_request_type,
        employee: defaultAttendanceData?.reference_document?.employee,
        company: "",
        checkin_time: defaultAttendanceData?.reference_document
          ?.custom_from_time
          ? new Date(
            `1970-01-01T${normalizeTime(
              defaultAttendanceData?.reference_document.custom_from_time,
            )}`,
          )
          : undefined,
        checkout_time: defaultAttendanceData?.reference_document?.custom_to_time
          ? new Date(
            `1970-01-01T${normalizeTime(
              defaultAttendanceData?.reference_document?.custom_to_time,
            )}`,
          )
          : undefined,
        custom__request_reason:
          defaultAttendanceData?.reference_document?.custom__request_reason ||
          "",
        custom_location:
          defaultAttendanceData?.reference_document?.custom_location,
        select_shift: defaultAttendanceData?.reference_document?.shift || "",
        overnight_out_duty: false,
        message: defaultAttendanceData?.reference_document?.explanation || "",
        show_attachment: attendanceRequestAttachmentsMandatory?.is_mandatory,
        allowed_from_date:
          attendanceRequestAttachmentsMandatory?.allowed_from_date,
        allowed_to_date: attendanceRequestAttachmentsMandatory?.allowed_to_date,
        attachments:
          defaultAttendanceData?.attachments &&
            defaultAttendanceData?.attachments?.length > 0
            ? defaultAttendanceData?.attachments?.map((item) => {
              return {
                name: item?.file_url?.split("/").pop(),
                url: item?.file_url,
              };
            })
            : [],
        isForOthers: isForOthers,
        currentEmployeeId: currentEmployee?.employee || "",
        currentUserId: currentEmployee?.user_id || "",
      },
    }),
    // only recompute if these meaningful inputs change:
    [
      defaultAttendanceData,
      selectedDate,
      currentEmployee?.employee,
      currentEmployee?.user_id,
      isForOthers,
      attendanceRequestAttachmentsMandatory,
    ],
  );
  // Update hidden fields when isForOthers or currentEmployee changes
  useEffect(() => {
    if (formAddressInstance.current) {
      const isForOthersComponent =
        formAddressInstance.current.getComponent("isForOthers");
      const currentEmployeeIdComponent =
        formAddressInstance.current.getComponent("currentEmployeeId");
      const currentUserIdComponent =
        formAddressInstance.current.getComponent("currentUserId");

      if (isForOthersComponent) {
        isForOthersComponent.setValue(isForOthers);
      }
      if (currentEmployeeIdComponent && currentEmployee?.employee) {
        currentEmployeeIdComponent.setValue(currentEmployee.employee, {
          noUpdateEvent: true,
        });
      }
      if (currentUserIdComponent && currentEmployee?.user_id) {
        currentUserIdComponent.setValue(currentEmployee.user_id, {
          noUpdateEvent: true,
        });
      }

      if (formAddressInstance.current) {
        formAddressInstance.current.redraw();
      }
    }
  }, [isForOthers, currentEmployee]);

  // Sync attachment mandatory status and date limits
  useEffect(() => {
    if (formAddressInstance.current && attendanceRequestAttachmentsMandatory) {
      const showAttachmentComp =
        formAddressInstance.current.getComponent("show_attachment");
      const allowedFromDateComp =
        formAddressInstance.current.getComponent("allowed_from_date");
      const allowedToDateComp =
        formAddressInstance.current.getComponent("allowed_to_date");

      if (showAttachmentComp) {
        showAttachmentComp.setValue(
          String(!!attendanceRequestAttachmentsMandatory.is_mandatory),
          { noUpdateEvent: true },
        );
      }

      if (
        allowedFromDateComp &&
        attendanceRequestAttachmentsMandatory.allowed_from_date
      ) {
        allowedFromDateComp.setValue(
          attendanceRequestAttachmentsMandatory.allowed_from_date,
          { noUpdateEvent: true },
        );
      }

      if (
        allowedToDateComp &&
        attendanceRequestAttachmentsMandatory.allowed_to_date
      ) {
        allowedToDateComp.setValue(
          attendanceRequestAttachmentsMandatory.allowed_to_date,
          { noUpdateEvent: true },
        );
      }

      // Directly update the date components schema to enforce constraints
      const fromDateComp =
        formAddressInstance.current.getComponent("from_date");
      const toDateComp = formAddressInstance.current.getComponent("to_date");

      // Disable to_date if required by API
      if (toDateComp && toDateComp.component) {
        toDateComp.component.disabled =
          !!// eslint-disable-next-line @typescript-eslint/no-explicit-any
          (attendanceRequestAttachmentsMandatory as any)?.to_date_read_only;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateDateConstraints = (comp: any) => {
        if (comp && comp.component) {
          if (!comp.component.datePicker) comp.component.datePicker = {};
          if (!comp.component.widget) comp.component.widget = {};

          const parseDate = (d: string | undefined) => {
            if (!d) return undefined;
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? undefined : parsed;
          };

          const minD = parseDate(
            attendanceRequestAttachmentsMandatory.allowed_from_date,
          );
          const maxD = parseDate(
            attendanceRequestAttachmentsMandatory.allowed_to_date,
          );

          if (minD) {
            comp.component.datePicker.minDate = minD;
            comp.component.widget.minDate = minD;
            comp.component.minDate = minD;
          } else {
            delete comp.component.datePicker.minDate;
            delete comp.component.widget.minDate;
            delete comp.component.minDate;
          }

          if (maxD) {
            comp.component.datePicker.maxDate = maxD;
            comp.component.widget.maxDate = maxD;
            comp.component.maxDate = maxD;
          } else {
            delete comp.component.datePicker.maxDate;
            delete comp.component.widget.maxDate;
            delete comp.component.maxDate;
          }
        }
      };
      updateDateConstraints(fromDateComp);
      updateDateConstraints(toDateComp);

      // Refresh form to apply visibility changes and date limits
      // We save the current submission to ensure values aren't lost during redraw
      const currentSubmission = formAddressInstance.current.submission;
      formAddressInstance.current.redraw();
      if (currentSubmission) {
        formAddressInstance.current.submission = currentSubmission;
      }
    }
  }, [attendanceRequestAttachmentsMandatory]);

  // const formatTime = (date: Date | string | undefined): string | undefined => {
  //   if (!date) return undefined;
  //   const d = new Date(date);
  //   return d.toLocaleTimeString("en-GB");
  // };

  type CustomError = Error & {
    response?: { data?: { exception?: string } };
  };

  const loading = useLoadingOverlay();

  const handleSubmit = async (submission: { data: AttendanceFormData }) => {
    await loading?.wrap(() => {
      return new Promise<void>((resolve, reject) => {
        // Logic to determine employee: Use selected from form (if any) or fallback to current
        const selectedEmpId =
          submission.data.employee?.name || currentEmployee?.employee;

        const baseBody = {
          custom_request_type: submission.data.request_type,
          // If employee is selected (i.e. for others), use form company? Or always use current employee company?
          // Usually if applying for someone else, might want their company.
          // But let's stick to safe defaults or existing logic.
          // Existing: company: isForOthers ? submission.data.company : currentEmployee?.company
          // Let's keep existing logic for company or maybe infer from employee if we had that data.
          company: isForOthers
            ? submission.data.company
            : currentEmployee?.company,
          employee: selectedEmpId,
          explanation: submission.data.explanation,
          ...(submission.data.from_date && {
            from_date: formatDateToYYYYMMDD(
              new Date(submission.data.from_date),
            ),
          }),
          ...((submission.data.to_date ||
            (submission.data.request_type === "Out Duty" &&
              submission.data.from_date)) && {
            to_date:
              submission.data.request_type === "Out Duty" &&
                submission.data.from_date
                ? formatDateToYYYYMMDD(new Date(submission.data.from_date))
                : formatDateToYYYYMMDD(
                  new Date(submission.data.to_date as string),
                ),
          }),
        };

        let requestBody: Record<string, unknown> = { ...baseBody };

        const formatForPayload = (val: string | Date | undefined) => {
          if (!val) return undefined;
          if (val instanceof Date) {
            const h = val.getHours().toString().padStart(2, "0");
            const m = val.getMinutes().toString().padStart(2, "0");
            const s = val.getSeconds().toString().padStart(2, "0");
            return `${h}:${m}:${s}`;
          }
          if (typeof val === "string" && val.includes("T")) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              const h = d.getHours().toString().padStart(2, "0");
              const m = d.getMinutes().toString().padStart(2, "0");
              const s = d.getSeconds().toString().padStart(2, "0");
              return `${h}:${m}:${s}`;
            }
          }
          return val;
        };

        switch (submission.data.request_type) {
          case "Clockin":
            requestBody = {
              ...baseBody,
              to_date: baseBody.from_date,
              custom_from_time: formatForPayload(submission.data.checkin_time),
              custom__request_reason: submission.data.custom__request_reason,
              custom_location: submission?.data?.custom_location,
            };
            break;
          case "Out Duty":
            requestBody = {
              ...baseBody,
              to_date: baseBody.to_date,
              custom_from_time: formatForPayload(submission.data.checkin_time),
              custom_to_time: formatForPayload(submission.data.checkout_time),
              custom__request_reason: submission.data.custom__request_reason,
              overnight_out_duty: submission.data.overnight_out_duty || false,
            };
            break;

          case "Short Attendance Request":
            requestBody = {
              ...baseBody,
              from_date: formatDateToYYYYMMDD(
                new Date(submission.data.from_date || ""),
              ),
              to_date: formatDateToYYYYMMDD(
                new Date(submission.data.to_date || ""),
              ),
              custom_from_time: formatForPayload(submission.data.checkin_time),
              custom_to_time: formatForPayload(submission.data.checkout_time),
              custom__request_reason: submission.data.custom__request_reason,
            };
            break;

          case "Attendance Adjustment":
            requestBody = {
              ...baseBody,
              from_date: formatDateToYYYYMMDD(
                new Date(submission.data.from_date || new Date()),
              ),
              to_date: formatDateToYYYYMMDD(
                new Date(submission.data.to_date || new Date()),
              ),
              custom_from_time: formatForPayload(submission.data.checkin_time),
              custom_to_time: formatForPayload(submission.data.checkout_time),
              custom__request_reason: submission.data.custom__request_reason,
              custom_location: submission?.data?.custom_location,
            };
            break;

          case "Shift Change":
            requestBody = {
              ...baseBody,
              select_shift: submission.data.select_shift,
            };
            break;
        }

        if (
          submission.data.attachments?.[0] &&
          submission?.data?.attachments?.length > 0
        ) {
          requestBody.custom_attachment =
            submission.data?.attachments?.[0]?.url;
        }

        const handleSuccess = (message: string) => {
          resolve();
          onClose();
          setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: [`attendance-requests-${activeEmployeeId}`],
            });
            setRefetchAttendance(true);
          }, 4000);
          toast.success(message);
        };

        const handleError = (error: CustomError) => {
          const formatedError = errorResponseFormater(
            error,
            "Submission failed. Please try again.",
          );
          reject(error);
          toast.error(formatedError);
          console.error(error);
        };

        if (
          forActionType &&
          forActionType === "edit" &&
          defaultAttendanceData
        ) {
          updateAttendanceRequest(
            {
              doctype: "Attendance Request",
              name: defaultAttendanceData?.reference_document.name,
              data: requestBody as Record<string, unknown>,
            },
            {
              onSuccess: async (data: any) => {
                if (attachments?.length > 0) {
                  await uploadFiles(attachments, data.doctype, data.name);
                }
                handleSuccess("Updated Attendance Request successfully!");
              },
              onError: handleError,
            },
          );
        } else {
          mutation.mutate(requestBody as Record<string, unknown>, {
            onSuccess: async (data: any) => {
              if (attachments?.length > 0) {
                await uploadFiles(attachments, data.doctype, data.name);
              }
              handleSuccess("Added Attendance Request successfully!");
            },
            onError: handleError,
          });
        }
      });
    }, "Submitting Attendance Request…");
  };

  // Handle form change
  const handleFormChange = (submission: FormChangeSubmission) => {
    if (
      submission?.changed?.component?.key === "from_date" ||
      submission?.changed?.component?.key === "request_type"
    ) {
      const formInstance = formAddressInstance.current;

      if (formInstance) {
        const showAttachmentsComponent =
          formInstance.getComponent("show_attachment");
        if (
          showAttachmentsComponent &&
          attendanceRequestAttachmentsMandatory?.is_mandatory
        ) {
          showAttachmentsComponent.setValue(
            String(!!attendanceRequestAttachmentsMandatory?.is_mandatory),
            {
              noUpdateEvent: true,
            },
          );
          showAttachmentsComponent.redraw();
        }
      }
    }

    if (submission?.data?.from_date) {
      const newFrom = submission.data.from_date.toString();
      if (newFrom !== fromDateChanged) setFromDateChanged(newFrom);
    }
    if (submission?.data?.to_date) {
      const newTo = submission.data.to_date.toString();
      if (newTo !== toDateChanged) setToDateChanged(newTo);
    }
    if (submission?.changed?.component?.key === "employee") {
      setCurrentlySelectedEmployee(submission.changed.value as any);
    }
    if (submission?.changed?.component?.key === "request_type") {
      setRequestTypeChanged(submission.changed.value?.toString() || "");
    }
    if (submission?.changed?.component?.key === "isForOthers") {
      setIsForOthers(!!submission.changed.value);
    }
    // Also sync from submission.data just in case
    if (
      submission?.data?.isForOthers !== undefined &&
      !!submission.data.isForOthers !== isForOthers
    ) {
      setIsForOthers(!!submission.data.isForOthers);
    }

    if (submission?.changed?.component?.key === "attachments")
      setAttachments([
        ...attachments,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((submission?.data?.attachments as any) || []),
      ]);
  };

  const sortedLogs = useMemo(() => {
    const rawLogs = homeSummary || [];
    return [...rawLogs].sort((a, b) => {
      const timeA = new Date(a.time.replace(" ", "T")).getTime();
      const timeB = new Date(b.time.replace(" ", "T")).getTime();
      return timeA - timeB;
    });
  }, [homeSummary]);

  const latestCheckin =
    sortedLogs.find((c) => c.log_type === "IN")?.time || null;

  const latestCheckout =
    [...sortedLogs].reverse().find((c) => c.log_type === "OUT")?.time || null;

  // 3️⃣ Sync times whenever data or form instance is ready
  useEffect(() => {
    const instance = formAddressInstance.current;
    if (
      !instance ||
      !isFormReady ||
      isHomeSummaryLoading ||
      isHomeSummaryFetching
    )
      return;

    // In edit mode, we want to keep the values from the existing record initialized in onFormReady
    if (forActionType === "edit" && defaultAttendanceData) return;

    const checkinComp = instance.getComponent("checkin_time");
    const checkoutComp = instance.getComponent("checkout_time");

    const shiftStart = (shiftData as any)?.start_time;
    const shiftEnd = (shiftData as any)?.end_time;

    // Prioritize checkins from useHomeSummaryDetails over latestInAndOutTime and fallback to shift timings
    const normalizedCheckin = latestCheckin
      ? normalizeTime(latestCheckin)
      : normalizeTime(latestInAndOutTime?.in_time);

    const normalizedCheckout = latestCheckout
      ? normalizeTime(latestCheckout)
      : normalizeTime(latestInAndOutTime?.out_time);

    const finalCheckin = normalizedCheckin || normalizeTime(shiftStart);
    const finalCheckout = normalizedCheckout || normalizeTime(shiftEnd);

    let changed = false;
    if (checkinComp && finalCheckin) {
      // Use local Date object instead of ISO string to avoid UTC conversion issues
      const checkinDate = new Date(`1970-01-01T${finalCheckin}`);
      checkinComp.setValue(checkinDate as any, { noUpdateEvent: true });
      changed = true;
    }

    if (checkoutComp && finalCheckout) {
      // Use local Date object instead of ISO string to avoid UTC conversion issues
      const checkoutDate = new Date(`1970-01-01T${finalCheckout}`);
      checkoutComp.setValue(checkoutDate as any, {
        noUpdateEvent: true,
      });
      changed = true;
    }

    if (changed) {
      instance.redraw();
    }
  }, [
    latestCheckin,
    latestCheckout,
    shiftData,
    isFormReady,
    isHomeSummaryLoading,
    isHomeSummaryFetching,
    forActionType,
    defaultAttendanceData,
    latestInAndOutTime,
  ]);

  if (isSchemaLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="w-8 h-8 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="fixed inset-0  z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container */}
      <div className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            {forActionType === "edit" ? "Edit" : ""} Attendance Request
          </h2>
          {isDesktop && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-4 pt-4 pb-32 md:pb-6">
          {userRoles?.roles["Employee Direct Manager"] && canCreateAttendanceRequestForOthers ? (
            <div className="flex bg-white rounded-lg p-1 mt-2 border border-gray-200">
              <Button
                size="md"
                fullWidth
                variant={isForOthers ? "subtle" : "contain"}
                onClick={() => setIsForOthers(false)}
              >
                Self
              </Button>
              {<Button
                size="md"
                fullWidth
                variant={!isForOthers ? "subtle" : "contain"}
                onClick={() => setIsForOthers(true)}
              >
                For Others
              </Button>}
            </div>
          ) : null}
          <Form
            form={formSchema}
            onSubmit={handleSubmit}
            options={{
              builder: { styles: false },
              submitButton: false,
              noAlerts: true,
              clearOnSubmit: false,
              keepAlive: true,
              shiftData: shiftData,
              shiftRedraw: shiftData?.shift,
            }}
            onChange={handleFormChange}
            onFormReady={(instance: FormioFormInstance) => {
              formAddressInstance.current = instance;
              if (!initialSubmissionSet.current) {
                try {
                  // use setSubmission to initialize the form once
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (instance as any).setSubmission?.(initialSubmission);
                  initialSubmissionSet.current = true;
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (err) {
                  // fallback if setSubmission not available
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (instance as any).submission = initialSubmission;
                    initialSubmissionSet.current = true;
                  } catch (e) {
                    console.warn(
                      "Could not set initial submission on form instance",
                      e,
                    );
                  }
                }
              }

              // 5️⃣ Redraw once (initial)
              instance.redraw();

              // Signal that form is ready
              setIsFormReady(true);

              // Improve initial state detection
              const data = initialSubmission?.data as any;
              if (
                data?.isForOthers === true ||
                data?.isForOthers === "1" ||
                data?.isForOthers === 1
              ) {
                setIsForOthers(true);
              }
              if (data?.employee) {
                setCurrentlySelectedEmployee(data.employee);
              }
              if (data?.request_type) {
                setRequestTypeChanged(data.request_type.toString() || "");
              }
              // Disable dataSrc behavior on company field
              const companyComponent = instance.getComponent("company");
              if (companyComponent) {
                // Override the component's data source to prevent auto-fetching
                const comp = companyComponent as any;
                if (comp.component) {
                  delete comp.component.dataSrc;
                  delete comp.component.data;
                  delete comp.component.valueProperty;
                  delete comp.component.selectValues;
                  delete comp.component.refreshOn;
                }
              }

              try {
                const rootEl: HTMLElement | Document =
                  (instance && instance.element) || document;

                const flatInputs: NodeListOf<FlatpickrInput> = (
                  rootEl as HTMLElement
                ).querySelectorAll
                  ? (rootEl as HTMLElement).querySelectorAll<FlatpickrInput>(
                    "input.flatpickr-input",
                  )
                  : document.querySelectorAll<FlatpickrInput>(
                    "input.flatpickr-input",
                  );

                flatInputs.forEach((input) => {
                  const handler = () => {
                    flatInputs.forEach((other) => {
                      if (other !== input && other._flatpickr) {
                        try {
                          other._flatpickr.close();
                        } catch (err) {
                          console.error("flatpickr close failed", err);
                        }
                      }
                    });
                  };

                  // avoid adding duplicate listeners
                  if (!input.__closeOtherFPHandler) {
                    input.addEventListener("focus", handler);
                    input.__closeOtherFPHandler = handler;
                  }
                });
              } catch (err) {
                // non-fatal: attach failed, but app continues
                console.warn("flatpickr focus bind failed", err);
              }
            }}
            className="formio-no-border address-form-container mt-4"
          />
        </div>

        {/* Submit Bar */}
        <div className="fixed md:static bottom-0 w-full border-gray-200 bg-white border-t shadow-md p-4 z-20">
          <div className="max-w-4xl mx-auto flex flex-row md:flex-row gap-3 md:gap-4 md:justify-end">
            {!isDesktop && (
              <Button
                onClick={onClose}
                size="md"
                variant="outline"
                className="w-full md:w-auto min-w-[150px] md:px-4 md:py-2.5 rounded-md font-brand"
              >
                Cancel
              </Button>
            )}

            <Button
              onClick={() => formAddressInstance.current?.submit()}
              size="md"
              variant="contain"
              bgColor="primary"
              className="w-full md:w-auto min-w-[150px] md:px-4 md:py-2.5 rounded-md font-brand"
            >
              {mutation.isPending || uploadFileLoading ? (
                <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceRequestFormV2;
