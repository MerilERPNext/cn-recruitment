/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { Form } from "@tsed/react-formio";
import SideDrawer from "../shared/SideDrawer";
import toast from "react-hot-toast";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import { useGetEmployeeDetailsByEmpIdForProfile, useGetEmployeeFieldsToTrack } from "../../hooks/useEmployee";
import Button from "../shared/atoms/Button";
import CircularLoader from "../shared/atoms/CircularLoader";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { formatValueForFormio } from "./FrappeToFormIoConverterSepTabs";

interface EditableField {
    key: string;
    label: string;
    fieldname?: string;
    rowIndex?: number;
}

const SAME_AS_CURRENT_ADDRESS_MAP: Record<string, string> = {
    current_flat_no: "permanent_flat",
    current_street: "permanent_street",
    current_landmark: "permanent_landmark",
    current_pincode: "permanent_pincode",
    current_country: "permanent_country",
    current_state: "permanent_state",
    current_city: "permanent_city",
};

interface TabWithSchema {
    key: string;
    label: string;
    schema: any;
}

const EmployeeSidebarForm = ({
    edit,
    setEdit,
    formioTabs,
    formInstances,
    employeeId,
    refetchEmployee,
    employeeIsLoading,
}: {
    edit: EditableField | null,
    setEdit: (edit: EditableField | null) => void,
    formioTabs: TabWithSchema[],
    formInstances: React.MutableRefObject<Record<string, any>>,
    employeeId: string,
    refetchEmployee: () => void,
    employeeIsLoading: boolean | null
}) => {
    const mutation = useUpdateFrappeDocument();
    const [isDirty, setIsDirty] = useState(false);
    const isInitializing = useRef(true);
    const { data: employeeFieldsToTrack } = useGetEmployeeFieldsToTrack();

    const isApprovable = employeeFieldsToTrack?.some((field: any) => {
        return field.field_name == edit?.key
    })
    useEffect(() => {
        setIsDirty(edit?.rowIndex === -1);
        isInitializing.current = true;
    }, [edit]);
    const { data: employeeDataQueryResult } = useGetEmployeeDetailsByEmpIdForProfile(employeeId);
    const employee = employeeDataQueryResult?.employee;

    // Recursive helper to find a component by key in a Formio schema
    const findComponentByKey = useCallback((components: any[], key: string): any => {
        if (!components) return null;
        for (const comp of components) {
            if (comp.key === key) return comp;
            if (comp.components) {
                const found = findComponentByKey(comp.components, key);
                if (found) return found;
            }
            if (comp.columns) {
                for (const col of comp.columns) {
                    const found = findComponentByKey(col.components, key);
                    if (found) return found;
                }
            }
        }
        return null;
    }, []);

    const sectionSchema = formioTabs.find((tab) => tab.key === edit?.key)?.schema;
    let schema = sectionSchema;

    // Handle Granular Schema Slicing
    if (edit?.fieldname && sectionSchema?.components) {
        const component = findComponentByKey(sectionSchema.components, edit.fieldname);
        if (component) {
            if (edit.rowIndex !== undefined && component.type === "datagrid") {
                // Editing a specific row in a table
                schema = {
                    ...sectionSchema,
                    components: component.components
                };
            } else {
                // Editing a regular field
                schema = {
                    ...sectionSchema,
                    components: [component]
                };
            }
        }
    }

    // Truly recursive helper to fix file data based on schema
    const recursiveFixFileData = useCallback((data: any, components: any[]): any => {
        if (!components || !data) return data;

        const fixed = Array.isArray(data) ? [...data] : { ...data };

        components.forEach((comp: any) => {
            const key = comp.key;
            if (!key) return;

            if (comp.type === 'datagrid' && Array.isArray(fixed[key])) {
                fixed[key] = fixed[key].map((row: any) => recursiveFixFileData(row, comp.components));
            } else if (comp.components) {
                Object.assign(fixed, recursiveFixFileData(fixed, comp.components));
            } else if (comp.columns && Array.isArray(comp.columns)) {
                comp.columns.forEach((col: any) => {
                    Object.assign(fixed, recursiveFixFileData(fixed, col.components));
                });
            } else {
                // Use the shared formatter for all fields, passing display value if available
                const displayValue = data[`${key}_display`];
                fixed[key] = formatValueForFormio(fixed[key], comp, displayValue);
            }
        });

        return fixed;
    }, []);

    const submissionData = useMemo(() => {
        if (!employee || !edit || !schema) return { data: {} };

        let data: any = {};
        if (edit.fieldname) {
            const component = findComponentByKey(sectionSchema.components, edit.fieldname);
            if (edit.rowIndex !== undefined && edit.rowIndex !== -1 && (employee as any)[edit.fieldname]) {
                const row = (employee as any)[edit.fieldname][edit.rowIndex];
                data = recursiveFixFileData(row, component?.components || []);
            } else {
                const val = (employee as any)[edit.fieldname];
                const displayVal = (employee as any)[`${edit.fieldname}_display`];
                data = { [edit.fieldname]: formatValueForFormio(val, component, displayVal) };
            }
        } else {
            data = recursiveFixFileData(employee, schema.components || []);
        }
        return { data };
    }, [employee, edit, schema, sectionSchema, findComponentByKey, recursiveFixFileData]);

    const handleSubmit = async () => {
        try {
            const allData: Record<string, unknown> = {};

            const getSubmissionData = async (instanceKey: string) => {
                const instance = formInstances.current[instanceKey];
                if (instance) {
                    try {
                        const submission = await instance.submit();
                        return submission?.data || {};
                    } catch (err: any) {
                        // Formio throws a ValidationError (or array of errors) when validation fails.
                        // This is a local JS error — no API call is made.
                        const isFormioValidationError =
                            err?.name === "ValidationError" ||
                            (Array.isArray(err) && err.length > 0 && err[0]?.message) ||
                            (err?.errors && Array.isArray(err.errors));

                        if (isFormioValidationError) {
                            const errors: any[] = Array.isArray(err)
                                ? err
                                : err?.errors || [];
                            const messages = errors
                                .map((e: any) => e?.message || e?.toString())
                                .filter(Boolean);
                            toast.error(
                                messages.length > 0
                                    ? `Please fix the following: ${messages.join(", ")}`
                                    : "Please fill in all required fields correctly."
                            );
                            return null; // Signal to abort submission
                        }
                        throw err; // Re-throw unexpected errors
                    }
                }
                return {};
            };

            if (edit?.fieldname) {
                // Granular Edit Case
                const storageKey = `${edit.key}-${edit.fieldname}${edit.rowIndex !== undefined ? `-${edit.rowIndex}` : ""}`;
                const submittedFieldData = await getSubmissionData(storageKey);
                if (submittedFieldData === null) return; // Validation failed — abort

                if (edit.rowIndex !== undefined) {
                    const existingTableData = (employee as any)?.[edit.fieldname] || [];
                    if (edit.rowIndex === -1) {
                        allData[edit.fieldname] = [...existingTableData, submittedFieldData];
                    } else {
                        const updatedTableData = [...existingTableData];
                        updatedTableData[edit.rowIndex] = {
                            ...updatedTableData[edit.rowIndex],
                            ...submittedFieldData
                        };
                        allData[edit.fieldname] = updatedTableData;
                    }
                } else {
                    // Regular Field Case
                    Object.assign(allData, submittedFieldData);
                }
            } else if (edit?.key) {
                // Section Edit Case (Original)
                for (const tab of formioTabs) {
                    const data = await getSubmissionData(tab.key);
                    if (data === null) return; // Validation failed — abort
                    Object.assign(allData, data);
                }
            }

            const sanitizeData = (data: any, components: any[] = []): any => {
                if (data === null || data === undefined) return "";

                if (Array.isArray(data)) {
                    if (data.length === 0) return "";
                    // File check
                    if (data[0] && (data[0].storage === "customBase64" || data[0].storage === "url")) {
                        return data[0].url || "";
                    }
                    return data.map(item => sanitizeData(item, components));
                }

                if (data !== null && typeof data === 'object') {
                    const cleansed: Record<string, any> = {};
                    for (const [key, value] of Object.entries(data)) {
                        if (key === "branch") continue;

                        const comp = findComponentByKey(components, key);

                        // Handle Dependent relation
                        if (
                            comp?.isDependentRelation ||
                            (key === "relation" && comp?.data?.url?.includes("get_relationship_types"))
                        ) {
                            if (typeof value === "object" && value !== null && (value as any).code) {
                                cleansed[key] = (value as any).code;
                            } else if (typeof value === "string") {
                                const match = value.match(/^.+?\s\((.+?)\)$/);
                                cleansed[key] = match ? match[1] : value;
                            } else {
                                cleansed[key] = value ?? "";
                            }
                        } else if (comp?.isTableMultiSelect && comp.linkFieldName && Array.isArray(value)) {
                            cleansed[key] = value.map(v => ({ [comp.linkFieldName]: v }));
                        } else if (comp?.type === 'datagrid' && Array.isArray(value)) {
                            cleansed[key] = value.map(row => sanitizeData(row, comp.components));
                        } else if (
                            comp?.type === 'datetime' &&
                            comp?.enableTime === false &&
                            typeof value === 'string' &&
                            value.trim() !== ''
                        ) {
                            // Date-only field: strip time from ISO string → send "YYYY-MM-DD" to Frappe
                            const dateOnly = value.split('T')[0];
                            cleansed[key] = dateOnly || value;
                        } else {
                            cleansed[key] = sanitizeData(value, components);
                        }
                    }
                    return cleansed;
                }

                // Extract original value if it's in "displayValue (value)" format
                if (typeof data === 'string') {
                    const match = data.match(/^(.+?)\s\((.+?)\)$/);
                    if (match) {
                        return match[2];
                    }
                }

                return data;
            };

            const formattedData = sanitizeData(allData, formioTabs.map(t => t.schema.components).flat());

            if (employeeId) {
                mutation.mutate(
                    {
                        doctype: "Employee",
                        name: employeeId,
                        data: formattedData,
                    },
                    {
                        onSuccess() {
                            refetchEmployee()
                            toast.success("Updated Successfully.");
                            setEdit(null);
                        },
                        onError(err: any) {
                            const error = errorResponseFormater(err)
                            toast.error(error);
                            console.warn("Form submission error -", err);
                        },
                    }
                );
            }
        } catch (err) {
            const error = errorResponseFormater(err)
            toast.error(error);
            console.warn("Form submission error -", err);
        }
    };

    return (
        <div>
            <SideDrawer size="xxl" open={!!edit} onClose={() => setEdit(null)} title={edit?.label || ""}>
                {schema ? (
                    <div className="pb-16 overflow-hidden">
                        <Form
                            key={`${edit?.key}-${edit?.fieldname}-${edit?.rowIndex}`} // Force re-render on edit change
                            className="profile-form w-full max-w-full bg-white"
                            form={schema}
                            submission={submissionData}
                            onChange={(payload: any) => {
                                if (payload.changed && !isInitializing.current) {
                                    setIsDirty(true);

                                    if (payload.changed?.component?.key === "custom_same_as_current" && payload.changed.value === true) {
                                        const storageKey = edit?.fieldname
                                            ? `${edit.key}-${edit.fieldname}${edit.rowIndex !== undefined ? `-${edit.rowIndex}` : ""}`
                                            : edit?.key || "";
                                        const instance = formInstances.current[storageKey];
                                        if (instance && payload.data) {
                                            Object.entries(SAME_AS_CURRENT_ADDRESS_MAP).forEach(([currentKey, permanentKey]) => {
                                                const comp = instance.getComponent(permanentKey);
                                                if (comp) comp.setValue(payload.data[currentKey] || "");
                                            });
                                        }
                                    }
                                }
                            }}
                            onFormReady={(instance: any) => {
                                if (!edit) return;
                                const storageKey = edit.fieldname
                                    ? `${edit.key}-${edit.fieldname}${edit.rowIndex !== undefined ? `-${edit.rowIndex}` : ""}`
                                    : edit.key;
                                formInstances.current[storageKey] = instance;

                                // Ignore initial change events during data population
                                setTimeout(() => {
                                    isInitializing.current = false;
                                }, 500);
                            }}
                            options={{
                                builder: { styles: false },
                                submitButton: false,
                                alerts: false,
                                disableOnSubmit: true,
                                rowClass: "flex flex-col md:flex-row md:space-x-4",
                                labelClass: "mb-1 font-medium text-gray-700",
                                inputClass:
                                    "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
                                validateOnInit: true,
                                validateOnBlur: true,
                                validateOnChange: false,
                            }}
                        />
                        {/* Submit button */}
                        <div className="w-full bg-white pt-4">
                            <Button
                                onClick={handleSubmit}
                                disabled={mutation?.isPending || !isDirty}
                                size="md"
                                fullWidth
                                className="bg-primary-600 hover:bg-primary-700 text-white font-bold"
                            >
                                {mutation?.isPending || employeeIsLoading ? (
                                    <CircularLoader size="sm" color="white" />
                                ) : (
                                    edit?.rowIndex === -1
                                ? `Add Entry ${isApprovable ? "For Approval" : ""}`
                                : `Submit ${edit?.fieldname ? "Field" : "Section"} ${isApprovable ? "For Approval" : ""}`
                                )}{" "}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <CircularLoader size="sm" color="gray-700" />
                )}
            </SideDrawer>
        </div>
    );
};

export default EmployeeSidebarForm;