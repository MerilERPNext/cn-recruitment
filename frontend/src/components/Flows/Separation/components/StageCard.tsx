import { createPortal } from "react-dom";
import { Form } from "@tsed/react-formio";
import { Eye } from "lucide-react";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useApprovalListActions } from "../../../../hooks/userApprovalList";
import { FormIOComponent, FormIOSchema } from "../../../../types/formio";
import { useCallback, useMemo, useState } from "react";
import { ApprovalStage } from "./ApprovalTracker";
import toast from "react-hot-toast";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import ReviewForm from "./ReviewForm";
import StatusTimelineRow from "../../Confirmation/components/StatusTimelineRow";
import { queryClient } from "../../../../providers/QueryProvider";
import formatToIndianDate from "../../../../utils/formatToIndianDate";

interface CardStagesProps {
  data: ApprovalStage;
  actions: { name: string; hasForm: boolean }[];
  todoId: string;
  isActive: boolean;
  assignedTo: {
    emp_id: string;
    user_id: string;
    role: string | null;
  };
  isLastStage: boolean;
}

const CardStages = ({
  data,
  actions,
  todoId,
  isActive,
  assignedTo,
  isLastStage,
}: CardStagesProps) => {
  const [formSchema, setFormSchema] = useState<FormIOSchema | null>(null);
  const [show, setShow] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const handleShowForm = (
    schema: FormIOComponent[] | undefined,
    approval_response_data: string,
  ) => {
    const data = JSON.parse(approval_response_data);

    setFormSchema((prev) => {
      if (!schema) return prev;

      const updatedSchema = schema.map((component) => {
        const key = component.key;

        if (key && data[key] !== undefined) {
          return {
            ...component,
            defaultValue: data[key],
          };
        }

        return component;
      });

      return {
        display: "form",
        components: updatedSchema,
      };
    });
    setShow(true);
  };

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || "",
  );
  const mutation = useApprovalListActions();

  const handleAction = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (action: { name: string; hasForm: boolean }, data: any) => {
      try {
        if (mutation?.isPending) return;
        setLoadingActions(true);
        const response = await mutation?.mutateAsync({
          action: action.name,
          name: data?.todo_id || "",
        });

        console.log("Action response:", response);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseWithSession = response as unknown as { session?: any };
        console.log("Session data:", responseWithSession?.session);
        console.log(
          "Assistant trigger enabled:",
          data?.custom_open_chatnext_assistant_on_action,
        );

        console.log(
          "Opening assistant with session:",
          responseWithSession?.session,
        );

        if (window.trigger_chatnext_assistant && action.hasForm) {
          window.trigger_chatnext_assistant(true, responseWithSession?.session);
        }

        if (!action.hasForm) {
          queryClient.invalidateQueries({ queryKey: ["separation-todo"] });
        }

        if (action.name.toLowerCase() !== "approve") {
          // triggerRefetch();
        }

        // Query invalidation now handled by Frappe realtime events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        const exceptions = error?.response?.data?.exception?.split(":");
        const errMessage =
          exceptions?.length > 1
            ? exceptions[1] + " " + exceptions[2]
            : exceptions[1];
        console.error("Action failed", error);
        toast.error(errMessage);
      } finally {
        setLoadingActions(false);
      }
    },
    [mutation],
  );

  const canPerformActions = useMemo(() => {
    if (!isActive) return false;

    // Case 1: employee name matches assigned emp_id
    if (currentEmployee?.name === assignedTo?.emp_id) return true;

    // Case 2: user name matches assigned user_id
    if (
      assignedTo?.user_id === currentUser?.name ||
      currentUser?.name === data?.user_id
    )
      return true;

    // Case 3: user has a role matching assigned role
    if (
      currentUser?.roles &&
      currentUser.roles.some(
        (role) => role.role === assignedTo?.role || role.role == data?.role,
      )
    )
      return true;

    return false;
  }, [currentEmployee, assignedTo, isActive, currentUser]);

  const mapStatusTimeline = (status: string) => {
    if (isActive) return "action_required";
    switch (status) {
      case "Approved":
        return "completed";

      case "Pending":
        return "pending";

      case "Action Required":
        return "action_required";

      case "Rejected":
        return "rejected";
      default:
        return "default";
    }
  };

  const approverPerfix =
    data?.status == "Pending"
      ? "Process yet to be trigger for"
      : data?.status == "Approved"
        ? "Approved by "
        : data?.status == "Rejected"
          ? "Rejected by"
          : "Pending inputs from ";

  return (
    <div className="grid w-full lg:hover:bg-primary/20 cursor-pointer  items-center text-sm  lg:px-6">
      <StatusTimelineRow
        timelineData={{
          isLast: isLastStage,
          status: mapStatusTimeline(data?.status),
        }}
      >
        <div className="grid lg:grid-cols-2 grid-cols-1 py-2">
          <div className="ml-4 flex flex-col">
            <Typography variant="bodyMedium">{data?.stage_name}</Typography>
            <Typography variant="bodySmall">
              {approverPerfix} {data?.role || data?.user}
            </Typography>

            {data?.approval_response_data && data?.status != "Pending" && (
              <Button
                variant="subtle"
                size="md"
                onClick={() =>
                  handleShowForm(
                    data?.form_json?.components,
                    data?.approval_response_data,
                  )
                }
              >
                <Eye className="w-4 h-4" />
                View Form
              </Button>
            )}
          </div>

          <div className="flex justify-between items-start px-4 pt-1 pb-3">
            <div className="flex gap-3">
              {canPerformActions &&
                actions.map((action) => (
                  <Button
                    onClick={() => handleAction(action, { todo_id: todoId })}
                    loading={loadingActions}
                    disabled={loadingActions}
                  >
                    {action.name}
                  </Button>
                ))}
            </div>
            <div>
              {status == "action_required"
                ? "In Progress"
                : formatToIndianDate(data?.approval_time)}
            </div>
          </div>

          <div>{data?.user_id}</div>
        </div>
      </StatusTimelineRow>

      {formSchema &&
        show &&
        createPortal(
          <ReviewForm onClose={() => setShow(false)}>
            <Form
              form={formSchema}
              options={{
                readOnly: true, // This makes the entire form read-only
                viewAsHtml: false, // Set to true to render as plain HTML instead of form inputs
              }}
              submit={false}
            />
          </ReviewForm>,
          document.body,
        )}
    </div>
  );
};

export default CardStages;
