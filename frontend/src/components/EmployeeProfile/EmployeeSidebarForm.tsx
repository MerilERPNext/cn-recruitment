import { Form } from "@tsed/react-formio";
import SideDrawer from "../shared/SideDrawer";

const EmployeeSidebarForm = ({
    edit,
    setEdit,
    formioTabs,
    formInstances,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: { edit: any, setEdit: any, formioTabs: any, formInstances: any }) => {

    const schema = formioTabs.find((tab: { key: string }) => tab.key === edit?.key)?.schema;

    return (
        <div>
            <SideDrawer size="xl" open={!!edit} onClose={() => setEdit(null)} title={edit?.label || ""}>
                {schema ? (
                    <Form
                        className="profile-form w-full max-w-full bg-white"
                        form={schema}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onFormReady={(instance: any) => {
                            formInstances.current[edit?.key || ""] = instance;
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
                ) : (
                    <p className="text-gray-500">Loading form...</p>
                )}
            </SideDrawer>
        </div>
    );

};
export default EmployeeSidebarForm;