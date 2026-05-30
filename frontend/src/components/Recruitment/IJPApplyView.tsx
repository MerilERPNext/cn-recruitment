import { useState, useRef, useMemo } from "react";
import {
  propscomponent,
  IJPTableField,
  IJPApplicationSubmitPayload,
} from "./IJPTypes";
import formatToIndianDate from "../../utils/formatToIndianDate";
import {
  useIJPApplicationFields,
  useSubmitIJPApplication,
} from "../../hooks/useRecruitment";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import Button from "../shared/atoms/Button";
import { Loader2 } from "lucide-react";

interface FormioInstance {
  submit: () => void;
  [key: string]: unknown;
}

type FormValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | unknown[]
  | Record<string, unknown>;

interface FormioChangeEvent {
  data?: Record<string, FormValue>;
  [key: string]: unknown;
}

interface FormioSubmissionEvent {
  data: Record<string, FormValue>;
  [key: string]: unknown;
}

export default function ApplyView({
  job,
  onCancel,
  onSubmitDone,
}: propscomponent) {
  const { data: fields, isLoading, error } = useIJPApplicationFields(job.name);
  const submitMutation = useSubmitIJPApplication();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, FormValue>>({});
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<FormioInstance | null>(null);

  // Group unique sections in order of appearance
  const sections = useMemo(() => {
    if (!fields) return [];
    const unique = new Set<string>();
    fields.forEach((f) => {
      if (f.section) {
        unique.add(f.section);
      }
    });
    return Array.from(unique);
  }, [fields]);

  const activeSection = sections[currentStep];

  const fieldsInActiveSection = useMemo(() => {
    if (!fields || !activeSection) return [];
    return fields.filter(
      (f) => f.section === activeSection && f.visibility !== "Hidden",
    );
  }, [fields, activeSection]);

  // Generate Form.io schema dynamically
  const dynamicSchema = useMemo(() => {
    if (!activeSection || !fieldsInActiveSection) {
      return { display: "form", components: [] };
    }

    const components: Record<string, unknown>[] = [];

    fieldsInActiveSection.forEach((field) => {
      const required = field.reqd === 1;
      const label = field.display_name;
      const key = field.reference_name;
      const isReadOnly = field.editability === "Read Only";

      const base = {
        key,
        label,
        input: true,
        disabled: isReadOnly,
        validate: {
          required,
          customMessage: `${label} is required`,
        },
      };

      // ─── Table Fieldtype (Stacked Panels instead of Datagrid) ───
      if (field.fieldtype === "Table" && Array.isArray(field.table_fields)) {
        const rowCount = rowCounts[field.reference_name] || 1;
        const panels: Record<string, unknown>[] = [];

        for (let i = 0; i < rowCount; i++) {
          const rowComponents = field.table_fields.map(
            (subField: IJPTableField) => {
              const subRequired = subField.reqd === 1;
              const subLabel = subField.label;
              const subKey = `${field.reference_name}_${i}_${subField.fieldname}`;
              const subReadOnly = subField.read_only === 1;

              const subBase = {
                key: subKey,
                label: subLabel,
                input: true,
                disabled: subReadOnly,
                validate: {
                  required: subRequired,
                  customMessage: `${subLabel} is required`,
                },
              };

              if (subField.fieldtype === "Select") {
                const selectOptions = subField.options
                  ? subField.options
                      .split(/[\n,]/)
                      .map((opt: string) => opt.trim())
                      .filter(Boolean)
                  : [];
                return {
                  ...subBase,
                  type: "select",
                  dataSrc: "values",
                  data: {
                    values: selectOptions.map((opt: string) => ({
                      label: opt,
                      value: opt,
                    })),
                  },
                  template: "<span>{{ item.label }}</span>",
                };
              }

              if (
                subField.fieldtype === "Text" ||
                subField.fieldtype === "Long Text" ||
                subField.fieldtype === "Small Text"
              ) {
                return {
                  ...subBase,
                  type: "textarea",
                  rows: 2,
                  customClass: "col-span-2",
                };
              }

              if (
                subField.fieldtype === "Attach" ||
                subField.fieldtype === "Attach Image"
              ) {
                return {
                  ...subBase,
                  type: "file",
                  multiple: false,
                  storage: "customBase64",
                  filePattern: "*/*",
                };
              }

              if (subField.fieldtype === "Check") {
                return {
                  ...subBase,
                  type: "checkbox",
                };
              }

              if (subField.fieldtype === "Date") {
                return {
                  ...subBase,
                  type: "datetime",
                  enableDate: true,
                  enableTime: false,
                  format: "yyyy-MM-dd",
                };
              }

              if (
                subField.fieldtype === "Int" ||
                subField.fieldtype === "Float" ||
                subField.fieldtype === "Currency"
              ) {
                return {
                  ...subBase,
                  type: "number",
                };
              }

              return {
                ...subBase,
                type: "textfield",
              };
            },
          );

          panels.push({
            type: "panel",
            key: `${field.reference_name}_panel_${i}`,
            title: `${field.display_name} - Entry #${i + 1}`,
            components: rowComponents,
            customClass:
              "col-span-2 py-4 px-6 bg-slate-50 border border-slate-200 rounded-xl mb-4",
          });
        }

        components.push({
          type: "well",
          key: field.reference_name,
          label: field.display_name,
          components: panels,
          customClass: "col-span-2 mb-2",
        });
        return;
      }

      // ─── Pre-defined Fields mapping ───
      if (field.fieldtype === "Select") {
        const selectOptions = field.options
          ? field.options
              .split(/[\n,]/)
              .map((opt) => opt.trim())
              .filter(Boolean)
          : [];
        components.push({
          ...base,
          type: "select",
          dataSrc: "values",
          data: {
            values: selectOptions.map((opt) => ({ label: opt, value: opt })),
          },
          template: "<span>{{ item.label }}</span>",
        });
        return;
      }

      if (
        field.fieldtype === "Text" ||
        field.fieldtype === "Long Text" ||
        field.fieldtype === "Small Text"
      ) {
        components.push({
          ...base,
          type: "textarea",
          rows: 3,
          customClass: "col-span-2",
        });
        return;
      }

      if (field.fieldtype === "Attach" || field.fieldtype === "Attach Image") {
        components.push({
          ...base,
          type: "file",
          multiple: false,
          storage: "customBase64",
          filePattern: "*/*",
        });
        return;
      }

      if (field.fieldtype === "Check") {
        components.push({
          ...base,
          type: "checkbox",
        });
        return;
      }

      if (field.fieldtype === "Date") {
        components.push({
          ...base,
          type: "datetime",
          enableDate: true,
          enableTime: false,
          format: "yyyy-MM-dd",
        });
        return;
      }

      if (field.fieldtype === "Datetime") {
        components.push({
          ...base,
          type: "datetime",
          enableDate: true,
          enableTime: true,
          format: "yyyy-MM-dd HH:mm:ss",
        });
        return;
      }

      if (
        field.fieldtype === "Int" ||
        field.fieldtype === "Float" ||
        field.fieldtype === "Currency"
      ) {
        components.push({
          ...base,
          type: "number",
        });
        return;
      }

      components.push({
        ...base,
        type: "textfield",
      });
    });

    return {
      display: "form",
      components,
    };
  }, [activeSection, fieldsInActiveSection, rowCounts]);

  const handleFormChange = (changed: FormioChangeEvent) => {
    if (changed.data) {
      setFormData((prev) => ({ ...prev, ...changed.data }));
    }
  };

  const handleNextClick = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  // Transform flat fields back into Child Table Array for backend submission
  const transformFormDataForSubmit = (
    data: Record<string, FormValue>,
  ): IJPApplicationSubmitPayload => {
    const transformed: IJPApplicationSubmitPayload = {};

    const attachmentFields = new Set<string>();
    const tableAttachmentFields: Record<string, Set<string>> = {};

    if (fields) {
      fields.forEach((field) => {
        if (field.fieldtype === "Attach" || field.fieldtype === "Attach Image") {
          attachmentFields.add(field.reference_name);
        }
        if (field.fieldtype === "Table" && field.table_fields) {
          const subSet = new Set<string>();
          field.table_fields.forEach((sub) => {
            if (sub.fieldtype === "Attach" || sub.fieldtype === "Attach Image") {
              subSet.add(sub.fieldname);
            }
          });
          tableAttachmentFields[field.reference_name] = subSet;
        }
      });
    }

    const extractFileUrl = (val: unknown): FormValue => {
      if (Array.isArray(val) && val.length > 0) {
        const first = val[0];
        if (first && typeof first === "object") {
          const obj = first as Record<string, unknown>;
          const res = obj.url || obj.file_url || obj.name || "";
          return typeof res === "string" ? res : "";
        }
      }
      if (val && typeof val === "object" && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>;
        const res = obj.url || obj.file_url || obj.name || "";
        return typeof res === "string" ? res : "";
      }
      if (typeof val === "string") {
        return val;
      }
      return "";
    };

    // Copy non-table fields first
    Object.keys(data).forEach((key) => {
      const match = key.match(/^(.+)_(\d+)_(.+)$/);
      if (!match) {
        if (attachmentFields.has(key)) {
          transformed[key] = extractFileUrl(data[key]);
        } else {
          transformed[key] = data[key];
        }
      }
    });

    // Translate flat mapped row keys to arrays of objects
    if (fields) {
      fields.forEach((field) => {
        if (field.fieldtype === "Table") {
          const rowCount = rowCounts[field.reference_name] || 1;
          const rows: Record<string, FormValue>[] = [];

          for (let i = 0; i < rowCount; i++) {
            const rowData: Record<string, FormValue> = {};
            let hasValue = false;

            if (field.table_fields) {
              field.table_fields.forEach((subField) => {
                const key = `${field.reference_name}_${i}_${subField.fieldname}`;
                if (
                  data[key] !== undefined &&
                  data[key] !== null &&
                  data[key] !== ""
                ) {
                  const subAttachments = tableAttachmentFields[field.reference_name];
                  if (subAttachments && subAttachments.has(subField.fieldname)) {
                    rowData[subField.fieldname] = extractFileUrl(data[key]);
                  } else {
                    rowData[subField.fieldname] = data[key];
                  }
                  hasValue = true;
                }
              });
            }

            if (hasValue) {
              rows.push(rowData);
            }
          }

          transformed[field.reference_name] = rows;
        }
      });
    }

    // Set source of application to IJP
    transformed.source = "IJP";
    transformed.job_title = job.name;

    return transformed;
  };

  const handleFormSubmit = (submission: FormioSubmissionEvent) => {
    const nextData = { ...formData, ...submission.data };
    setFormData(nextData);

    if (currentStep < sections.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      const transformedPayload = transformFormDataForSubmit(nextData);
      submitMutation.mutate(
        {
          opening: job.name,
          data: transformedPayload,
        },
        {
          onSuccess: () => {
            setSubmitted(true);
            onSubmitDone(job.name);
          },
        },
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm text-gray-500 font-medium">
          Loading form details...
        </span>
      </div>
    );
  }

  if (error || !fields || fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3 text-center">
        <span className="text-sm text-rose-500 font-medium">
          {error ? error.message : "Failed to load IJP form fields."}
        </span>
        <Button onClick={onCancel}>Back to Opening</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden text-sm text-[#1a1a2e] px-2 ijp-apply-form-wrapper">
      <style>{`
        .ijp-apply-form-wrapper .field-required::after {
          content: " *" !important;
          color: #ef4444 !important;
          font-weight: 600 !important;
          display: inline-block !important;
          margin-left: 2px !important;
        }
      `}</style>
      {/* Breadcrumbs */}
      <div className="text-xs text-gray-500 mb-5">
        <span
          className="text-gray-500 cursor-pointer no-underline hover:underline"
          onClick={onCancel}
        >
          Internal Job Movement
        </span>
        <span className="mx-1.5 opacity-50">/</span>
        <strong>
          {job.job_title} ({job.opening_code || job.name})
        </strong>
      </div>

      {/* Header Panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3 mb-4 w-full max-w-full">
        <div className="min-w-0 flex-1 pr-2">
          <span className="text-lg font-semibold text-[#1a1a2e] block md:inline truncate">
            {job.job_title} ({job.opening_code || job.name})
          </span>
          <span className="text-xs text-gray-500 md:ml-2.5 block md:inline mt-1 md:mt-0">
            (Open since {job.posted_on ? formatToIndianDate(job.posted_on) : ""}
            )
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-full">
        {!submitted && (
          <div className="w-full md:w-56 shrink-0 bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs font-semibold mb-3 text-gray-700">
              Apply for IJP
            </div>
            <div className="flex flex-col gap-1.5">
              {sections.map((step, i) => {
                const active = i === currentStep;
                const done = i < currentStep;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs whitespace-normal ${
                      active
                        ? "text-blue-600 font-semibold bg-blue-50/50"
                        : done
                          ? "text-emerald-800 font-normal hover:bg-slate-50"
                          : "text-gray-500 font-normal hover:bg-slate-50"
                    }`}
                    onClick={() => setCurrentStep(i)}
                  >
                    <div
                      className={`w-[22px] h-[22px] rounded-full border-1.5 flex items-center justify-center text-[11px] shrink-0 ${
                        active
                          ? "border-blue-600 text-blue-600 font-semibold"
                          : done
                            ? "border-green-500 bg-emerald-100 text-emerald-800 font-semibold"
                            : "border-gray-300 text-gray-400 font-normal"
                      }`}
                    >
                      {done ? "✓" : active ? "→" : "○"}
                    </div>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Box */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 min-w-0">
          {submitted ? (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-green-600 flex items-center justify-center text-3xl font-semibold">
                ✓
              </div>
              <div className="text-lg font-semibold text-[#1a1a2e]">
                Congratulations!
              </div>
              <p className="text-xs text-gray-500 max-w-[360px] leading-relaxed">
                Your application for <strong>{job.job_title}</strong> has been
                successfully submitted. You can track its live status in the{" "}
                <strong>IJP Jobs Applied</strong> portal.
              </p>
              <Button onClick={onCancel}>Back to IJP Openings</Button>
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold mb-5 pb-2.5 border-b border-gray-100 text-[#1a1a2e]">
                {activeSection}
              </div>

              <Form
                key={`${activeSection}-${currentStep}-${JSON.stringify(rowCounts)}`}
                form={dynamicSchema}
                submission={{ data: formData }}
                onChange={handleFormChange}
                onSubmit={handleFormSubmit}
                onFormReady={(instance: FormioInstance) => {
                  formRef.current = instance;
                }}
                options={{
                  builder: { styles: false },
                  submitButton: false,
                  alerts: false,
                  validateOnInit: false,
                  validateOnBlur: true,
                  validateOnChange: false,
                  formClass: "space-y-4",
                  rowClass: "grid grid-cols-2 gap-4",
                  labelClass: "mb-1 text-xs text-slate-500 font-medium",
                  inputClass:
                    "w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none focus:border-blue-400",
                }}
              />

              {/* Add More button for Table fields */}
              {fieldsInActiveSection.map((field) => {
                if (field.fieldtype === "Table") {
                  return (
                    <div
                      key={`add-more-${field.reference_name}`}
                      className="mt-4 mb-6 flex justify-start"
                    >
                      <Button
                        variant="outline"
                        bgColor="primary"
                        onClick={() => {
                          setRowCounts((prev) => ({
                            ...prev,
                            [field.reference_name]:
                              (prev[field.reference_name] || 1) + 1,
                          }));
                        }}
                      >
                        + Add More {field.display_name}
                      </Button>
                    </div>
                  );
                }
                return null;
              })}

              {/* Navigation Buttons */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    bgColor="secondary"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                )}
                {currentStep < sections.length - 1 ? (
                  <Button bgColor="primary" onClick={handleNextClick}>
                    Save &amp; Next
                  </Button>
                ) : (
                  <Button
                    bgColor="primary"
                    onClick={handleNextClick}
                    loading={submitMutation.isPending}
                  >
                    Submit Application
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
