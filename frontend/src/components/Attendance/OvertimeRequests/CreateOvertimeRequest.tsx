/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef, useMemo, useState } from "react";
import "../../../formio.custom.css";
import {
  useCreatePlannedOvertimeRequest,
  usePlannedOvertimeRequestAttachments,
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

interface RequestOvertimeProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
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

const CreateOvertimeRequest = ({ onCancel }: RequestOvertimeProps) => {
  const formInstance = useRef<any>(null);
  const initialSubmissionSet = useRef(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { setRefetchAttendance } = useGlobalStore();
  const { isDesktop } = useScreenSize();

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { uploadFiles, loading: uploadFileLoading } = useFileUploader();

  const mutation = useCreatePlannedOvertimeRequest();
  const { data: plannedOvertimeRequestAttachments } =
    usePlannedOvertimeRequestAttachments(currentEmployee?.employee || "");

  /** Memoized initial value to avoid rerender resets */
  const initialSubmissionData = useMemo(
    () => ({
      data: {
        show_attachment: !plannedOvertimeRequestAttachments,
      },
    }),
    [plannedOvertimeRequestAttachments]
  );

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
    "Overtime Child table"
  );
  const { data: requiredFieldsParent } = useRequiredFields(
    "Planned Overtime Request"
  );

  const requiredFieldMap = useMemo(() => {
    if (!requiredFieldsChild?.fields) return {};
    const map: Record<string, boolean> = {};
    requiredFieldsChild.fields.forEach((f) => {
      if (f.fieldname) map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
    });
    requiredFieldsParent?.fields.forEach((f) => {
      if (f.fieldname && f.fieldname != "overtime_details")
        map[f.fieldname] = f.reqd === 1 && f.hidden === 0;
    });
    return map;
  }, [requiredFieldsChild, requiredFieldsParent]);

  console.log("requiredFieldMap", requiredFieldMap);

  const transformSchemaWithRequired = (
    baseSchema: FormSchema,
    requiredMap: Record<string, boolean>
  ): FormSchema => {
    if (!baseSchema) return baseSchema;
    const cloned = JSON.parse(JSON.stringify(baseSchema)) as FormSchema;

    const applyToComponents = (components?: SchemaComponent[]) => {
      if (!components) return;
      components.forEach((comp) => {
        const key = comp.key;
        if (key && requiredMap[key]) {
          if (!comp.validate) comp.validate = {};
          comp.validate.required = true;

          if (typeof comp.label === "string") {
            const asteriskHtml =
              "<span style='color:red;margin-left:3px;'> *</span>";
            if (!comp.label.includes(asteriskHtml)) {
              comp.label = `${comp.label} ${asteriskHtml}`;
            }
          }
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
            row.forEach((cell: any) => applyToComponents(cell.components))
          );
        }
      });
    };

    applyToComponents(cloned.components);
    return cloned;
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
        })
      );

      await new Promise<void>((resolve, reject) => {
        mutation.mutate(
          {
            employee: currentEmployee?.employee || "",
            overtime_details: formattedOvertimeDetails || [],
          },
          {
            onSuccess: async (data: any) => {
              if (attachments?.length > 0) {
                await uploadFiles(
                  attachments,
                  data.doctype,
                  data.name,
                  () => {
                    setAttachments([]);
                    onCancel?.();
                    setTimeout(() => setRefetchAttendance(true), 1000);
                  }
                );
              }
              resolve();
                toast.success("Overtime Requests SuccessFully");
            },
            onError: (e: CustomError) => {
              const formattedError = errorResponseFormater(
                e,
                "Request Failed"
              );
              toast.error(formattedError);
              console.error(e);
              reject(e);
            },
          }
        );
      });
    } catch (err) {
      toast.error("Please fill in all required fields.");
      console.warn("Form submission error -", err);
      throw err;
    }
  }, "Submitting overtime request…");
};


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel?.();
          setAttachments([]);
        }
      }}
    >
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Planned Overtime Request
          </h2>
          {isDesktop &&  (  <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel?.();
              setAttachments([]);
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>)}
        </div>

        {/* Form.io Form */}
        <div className="flex-1 min-h-0 px-6 py-4">
          <Form
            form={transformSchemaWithRequired(
              overtimeRequestSchema,
              requiredFieldMap
            )}
            onChange={(submission: any) => {
              if (submission?.changed?.component?.key === "attachment")
                setAttachments(submission?.data?.attachment || []);
            }}
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
              validateOnInit: true,
              validateOnBlur: true,
              validateOnChange: false,
            }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
  <div className="max-w-4xl mx-auto flex flex-row md:flex-row gap-3 md:gap-4 md:justify-end">
    
  {!isDesktop &&  ( <Button
      onClick={(e) => {
        e.stopPropagation();
        onCancel?.();
        setAttachments([]);
      }}
      size="md"
      variant="outline"
      bgColor="primary"
      className="w-full md:w-auto min-w-[150px]"
    >
      Cancel
    </Button>)}

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
        "Submit"
      )}
    </Button>

  </div>
</div>

      </div>
    </div>
  );
};

export default CreateOvertimeRequest;
