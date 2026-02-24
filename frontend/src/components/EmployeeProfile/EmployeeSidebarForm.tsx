/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { Form } from "@tsed/react-formio";
import SideDrawer from "../shared/SideDrawer";
import toast from "react-hot-toast";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import { useGetEmployeeDetailsByEmpIdForProfile } from "../../hooks/useEmployee";
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

    useEffect(() => {
        setIsDirty(false);
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
                // Use the shared formatter for all fields
                fixed[key] = formatValueForFormio(fixed[key], comp);
            }
        });

        return fixed;
    }, []);

    const submissionData = useMemo(() => {
        if (!employee || !edit || !schema) return { data: {} };

        let data: any = {};
        if (edit.fieldname) {
            const component = findComponentByKey(sectionSchema.components, edit.fieldname);
            if (edit.rowIndex !== undefined && (employee as any)[edit.fieldname]) {
                const row = (employee as any)[edit.fieldname][edit.rowIndex];
                data = recursiveFixFileData(row, component?.components || []);
            } else {
                const val = (employee as any)[edit.fieldname];
                data = { [edit.fieldname]: formatValueForFormio(val, component) };
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
                    const submission = await instance.submit();
                    return submission?.data || {};
                }
                return {};
            };

            if (edit?.fieldname) {
                // Granular Edit Case
                const storageKey = `${edit.key}-${edit.fieldname}${edit.rowIndex !== undefined ? `-${edit.rowIndex}` : ""}`;
                const submittedFieldData = await getSubmissionData(storageKey);

                if (edit.rowIndex !== undefined) {
                    // Table Row Case: Fetch existing array and update the specific index
                    const existingTableData = (employee as any)?.[edit.fieldname] || [];
                    const updatedTableData = [...existingTableData];
                    updatedTableData[edit.rowIndex] = {
                        ...updatedTableData[edit.rowIndex],
                        ...submittedFieldData
                    };
                    allData[edit.fieldname] = updatedTableData;
                } else {
                    // Regular Field Case
                    Object.assign(allData, submittedFieldData);
                }
            } else if (edit?.key) {
                // Section Edit Case (Original)
                for (const tab of formioTabs) {
                    const data = await getSubmissionData(tab.key);
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

                        // Handle Table MultiSelect wrapping
                        if (comp?.isTableMultiSelect && comp.linkFieldName && Array.isArray(value)) {
                            cleansed[key] = value.map(v => ({ [comp.linkFieldName]: v }));
                        } else if (comp?.type === 'datagrid' && Array.isArray(value)) {
                            cleansed[key] = value.map(row => sanitizeData(row, comp.components));
                        } else {
                            cleansed[key] = sanitizeData(value, components);
                        }
                    }
                    return cleansed;
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
                                    `Update ${edit?.fieldname ? "Field" : "Section"}`
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