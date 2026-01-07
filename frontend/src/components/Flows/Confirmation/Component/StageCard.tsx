
import { createPortal } from "react-dom"
import { Form } from "@tsed/react-formio"
import { X } from "lucide-react"
import Badge from "../../../shared/Badge"
import useCurrentUser from "../../../../hooks/useCurrentUser"
import { useApprovalListActions } from "../../../../hooks/userApprovalList"
import { useScreenSize } from "../../../../hooks/useScreenSize"
import { FormIOComponent, FormIOSchema } from "../../../../types/formio"
import { useCallback, useMemo, useState } from "react"
import { ApprovalStage } from "./ApprovalTracker"
import toast from "react-hot-toast"
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee"

interface CardStagesProps {
    triggerRefetch: () => void;
    data: ApprovalStage;
    actions: string[];
    todoId: string;
    isActive: boolean;
    assignedTo: {
        emp_id: string;
        role: string;
    }
};

const CardStages = ({ triggerRefetch, data, actions, todoId, isActive, assignedTo }: CardStagesProps) => {


    const [formSchema, setFormSchema] = useState<FormIOSchema | null>(null);
    const [show, setShow] = useState(false);

    const handleShowForm = (schema: FormIOComponent[] | undefined) => {
        setFormSchema((prev) => {
            if (!schema)
                return prev;
            return ({
                display: "form",
                components: [
                    ...schema
                ]
            })
        });
        setShow(true);
    }

    const statusColors = {
        "Approved": "text-green-500 bg-green-100",
        "Rejected": "text-red-500 bg-red-100",
        "Pending": "text-gray-500 bg-gray-100",
    }

    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(currentUser?.name || "");
    const mutation = useApprovalListActions();
    const { isDesktop } = useScreenSize();

    const handleAction = useCallback(
        async (action: string, data: any) => {
            try {
                if (mutation?.isPending) return;
                // setLoadingAction({ id: data?.todo_id, action });
                const response = await mutation?.mutateAsync({
                    action,
                    name: data?.todo_id || "",
                });

                console.log("Action response:", response);
                const responseWithSession = response as unknown as { session?: any };
                console.log("Session data:", responseWithSession?.session);
                console.log(
                    "Assistant trigger enabled:",
                    data?.custom_open_chatnext_assistant_on_action
                );


                console.log(
                    "Opening assistant with session:",
                    responseWithSession?.session
                );

                if (window.trigger_chatnext_assistant) {
                    window.trigger_chatnext_assistant(
                        true,
                        responseWithSession?.session
                    );
                }
                if (action.toLowerCase() !== "approve") {
                    triggerRefetch();
                }

                // Query invalidation now handled by Frappe realtime events
            } catch (error: any) {
                const exceptions = error?.response?.data?.exception?.split(":");
                const errMessage =
                    exceptions?.length > 1
                        ? exceptions[1] + " " + exceptions[2]
                        : exceptions[1];
                console.error("Action failed", error);
                toast.error(errMessage);
            } finally {
                // setLoadingAction(null);
            }
        },
        [mutation, triggerRefetch]
    );

    const canPerformActions = useMemo(() => {
        if (!isActive) return false;
        if (!currentEmployee?.name || assignedTo?.emp_id) return false;
        if (currentEmployee.name === assignedTo?.emp_id) return true;
        if (currentUser?.roles && currentUser.roles.some(role => role.role === assignedTo?.role)) return true;
        return false;
    }, [currentEmployee, assignedTo, isActive, currentUser]);

    return (
        <div className="grid w-full lg:grid-cols-4  lg:hover:bg-blue-50 py-3 items-center text-sm  lg:px-6">
            {isDesktop ?
                <>
                    <span>{data?.stage_name}</span>
                    <span>{data?.user}</span>
                    <span> <Badge label={data?.status} textColor={statusColors[data?.status]} /></span>
                    <span className="flex gap-2">
                        {data?.form_json?.components && data.status !== "Pending" &&
                            <button className={`rounded-lg ring-1 hover:font-semibold transition-all duration-100 ring-blue-500 text-blue-500 hover:ring-2 px-1 py-1 text-sm`}
                                onClick={() => handleShowForm(data?.form_json?.components)}> Show Review </button>}
                        {canPerformActions &&
                            actions.map(action => (
                                <button onClick={() => handleAction(action, { todo_id: todoId })} className="rounded-lg ring-1 hover:font-semibold transition-all duration-300 ring-blue-500 text-blue-500 hover:ring-2 px-1 py-1 text-sm">
                                    {action}
                                </button>
                            ))
                        }
                    </span>
                </>
                :
                <div className="w-full rounded-2xl bg-white shadow-sm border border-gray-200  p-4 space-y-4">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                                Stage
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                                {data?.stage_name}
                            </p>
                        </div>

                        <Badge
                            label={data?.status}
                            textColor={statusColors[data?.status]}
                        />
                    </div>

                    {/* User */}
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                            Assigned To
                        </p>
                        <p className="text-sm font-medium text-gray-800">
                            {data?.user}
                        </p>
                    </div>

                    {/* Review Button */}
                    {data?.form_json?.components && data.status !== "Pending" && (
                        <button
                            onClick={() => handleShowForm(data?.form_json?.components)}
                            className="w-full rounded-xl border border-blue-200 bg-blue-50 text-blue-600 py-2 text-sm font-medium hover:bg-blue-100 transition"
                        >
                            View Review Form
                        </button>
                    )}

                    {/* Actions */}
                    {canPerformActions && actions?.length > 0 && (
                        <div className="flex items-center gap-2 pt-2">
                            {actions.map((action) => (
                                <button
                                    key={action}
                                    onClick={() => handleAction(action, { todo_id: todoId })}
                                    className="w-full rounded-xl border border-blue-500 text-blue-600 py-2 text-sm font-semibold hover:bg-blue-500 hover:text-white transition-all"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            }
            {formSchema && show &&
                createPortal(<div className="fixed inset-0 z-50 bg-black/10 flex justify-center items-center">
                    <div className="max-w-[500px] mx-2 w-full rounded-xl bg-white p-6">
                        <div className="flex border-b pb-2 mb-2">
                            <p className="text-xl font-semibold">Review Form</p>
                            <X className="ml-auto text-gray-500 hover:text-gray-800 cursor-pointer rounded-full  hover:bg-gray-100 w-10 h-10 p-2" onClick={() => setShow(false)} />
                        </div>
                        <div>
                            <Form
                                form={formSchema}
                                options={{
                                    readOnly: true, // This makes the entire form read-only
                                    viewAsHtml: false // Set to true to render as plain HTML instead of form inputs
                                }}
                                submit={false}
                            />
                        </div>
                    </div>
                </div>, document.body)
            }

        </div>
    )
}

export default CardStages;