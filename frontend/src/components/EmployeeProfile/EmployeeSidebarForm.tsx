import { Form } from "@tsed/react-formio";
import SideDrawer from "../shared/SideDrawer";
import toast from "react-hot-toast";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import { useGetEmployeeDetailsByEmpIdForProfile } from "../../hooks/useEmployee";
import Button from "../shared/atoms/Button";
import CircularLoader from "../shared/atoms/CircularLoader";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

const EmployeeSidebarForm = ({
    edit,
    setEdit,
    formioTabs,
    formInstances,
    employeeId,
    refetchEmployee,
    employeeIsLoading,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: { edit: any, setEdit: any, formioTabs: any, formInstances: any, employeeId: string, refetchEmployee: () => void, employeeIsLoading: boolean | null }) => {

    const mutation = useUpdateFrappeDocument();
    const { data: employeeDataQueryResult } = useGetEmployeeDetailsByEmpIdForProfile(employeeId);
    const employee = employeeDataQueryResult?.employee;

    // Recursive helper to find a component by key in a Formio schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findComponentByKey = (components: any[], key: string): any => {
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
    };

    const sectionSchema = formioTabs.find((tab: { key: string }) => tab.key === edit?.key)?.schema;
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
            } else {
                // Section Edit Case (Original)
                for (const tab of formioTabs) {
                    const data = await getSubmissionData(tab.key);
                    Object.assign(allData, data);
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sanitizeData = (data: any): any => {
                if (Array.isArray(data)) {
                    if (data.length === 0) return "";
                    if (data[0]?.storage === "customBase64" || data[0]?.storage === "url") {
                        return data[0]?.url || "";
                    }
                    return data.map(item => sanitizeData(item));
                }

                if (data !== null && typeof data === 'object') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const cleansed: Record<string, any> = {};
                    for (const [key, value] of Object.entries(data)) {
                        if (key === "branch") continue;
                        cleansed[key] = sanitizeData(value);
                    }
                    return cleansed;
                }

                return data;
            };

            const formattedData = sanitizeData(allData);

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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onFormReady={(instance: any) => {
                                const storageKey = edit?.fieldname
                                    ? `${edit.key}-${edit.fieldname}${edit.rowIndex !== undefined ? `-${edit.rowIndex}` : ""}`
                                    : edit?.key || "";
                                formInstances.current[storageKey] = instance;

                                if (employee && edit?.fieldname) {
                                    if (edit.rowIndex !== undefined && employee[edit.fieldname]) {
                                        // Specific row in a table
                                        const rowData = employee[edit.fieldname][edit.rowIndex];
                                        instance.submission = { data: rowData };
                                    } else if (employee[edit.fieldname] !== undefined) {
                                        // Regular single field
                                        instance.submission = { data: { [edit.fieldname]: employee[edit.fieldname] } };
                                    }
                                }
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
                                disabled={mutation?.isPending}
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