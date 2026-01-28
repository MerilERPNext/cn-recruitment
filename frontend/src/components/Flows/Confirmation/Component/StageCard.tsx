import { createPortal } from "react-dom";
import { Form } from "@tsed/react-formio";
import { Check, Clock, Hourglass, X } from "lucide-react";
import Badge from "../../../shared/Badge";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useApprovalListActions } from "../../../../hooks/userApprovalList";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { FormIOComponent, FormIOSchema } from "../../../../types/formio";
import { useCallback, useMemo, useState } from "react";
import { ApprovalStage } from "./ApprovalTracker";
import toast from "react-hot-toast";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import ReivewForm from "./ReivewForm";

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

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-yellow-100 text-yellow-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimelineConfig = (status: string, isActive: boolean) => {
    switch (status) {
      case "Approved":
        return {
          icon: Check, // no circle
          color: "text-white",
          bg: "bg-green-600",
          line: "bg-green-400",
        };

      case "Rejected":
        return {
          icon: X, // no circle
          color: "text-white",
          bg: "bg-red-600",
          line: "bg-red-400",
        };

      case "Pending":
        if (isActive) {
          return {
            icon: Hourglass,
            color: "text-white",
            bg: "bg-yellow-500",
            line: "bg-yellow-400",
          };
        }

        return {
          icon: Clock,
          color: "text-white",
          bg: "bg-gray-500",
          line: "bg-gray-400",
        };

      default:
        return {
          icon: Clock,
          color: "text-white",
          bg: "bg-gray-500",
          line: "bg-gray-400",
        };
    }
  };

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || "",
  );
  const mutation = useApprovalListActions();
  const { isDesktop } = useScreenSize();

  const handleAction = useCallback(
    async (action: { name: string; hasForm: boolean }, data: any) => {
      try {
        if (mutation?.isPending) return;
        setLoadingActions(true);
        const response = await mutation?.mutateAsync({
          action: action.name,
          name: data?.todo_id || "",
        });

        console.log("Action response:", response);
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

        if (action.name.toLowerCase() !== "approve") {
          // triggerRefetch();
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
    if (assignedTo?.user_id === currentUser?.name) return true;

    // Case 3: user has a role matching assigned role
    if (
      currentUser?.roles &&
      currentUser.roles.some((role) => role.role === assignedTo?.role)
    )
      return true;

    return false;
  }, [currentEmployee, assignedTo, isActive, currentUser]);

  return (
    <div className="grid w-full lg:border-t-1 lg:grid-cols-4  lg:hover:bg-primary/20 cursor-pointer py-3 items-center text-sm  lg:px-6">
      {isDesktop ? (
        <>
          <div className="h-full w-20">
            <TimeLineBadge
              isLastStage={isLastStage}
              data={getTimelineConfig(data?.status, isActive)}
            />
          </div>
          <Typography
            variant="bodySmall"
            className="font-semibold tracking-tight"
          >
            {data?.stage_name}
          </Typography>
          <Typography
            variant="bodySmall"
            className="font-semibold tracking-tight"
          >
            {data?.user}
          </Typography>

          <span className="flex gap-2">
            {data?.form_json?.components && data.status !== "Pending" && (
              <Button
                onClick={() =>
                  handleShowForm(
                    data?.form_json?.components,
                    data?.approval_response_data,
                  )
                }
                variant="contain"
                className="text-sm"
                loading={loadingActions}
                disabled={loadingActions}
              >
                {" "}
                Show Review{" "}
              </Button>
            )}
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
          </span>
        </>
      ) : (
        <div className="w-full flex h-full">
          <div className="h-full w-20">
            <TimeLineBadge
              isLastStage={isLastStage}
              data={getTimelineConfig(data?.status, isActive)}
            />
          </div>
          <div
            className={`w-full rounded-2xl bg-white shadow-sm border border-gray-200  p-4 space-y-4`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="bodySmall">Stage</Typography>
                <Typography variant="bodyMedium">{data?.stage_name}</Typography>
              </div>

              <Badge
                label={data?.status}
                textColor={getStatusBadgeClasses(data?.status)}
              />
            </div>

            {/* User */}
            <div>
              <Typography variant="bodySmall">Assigned To</Typography>
              <Typography variant="bodyMedium">{data?.user}</Typography>
            </div>

            {/* Review Button */}
            {data?.form_json?.components && data.status !== "Pending" && (
              <button
                onClick={() =>
                  handleShowForm(
                    data?.form_json?.components,
                    data?.approval_response_data,
                  )
                }
                className="w-full rounded-xl border border-blue-200 bg-primary/10 text-primary py-2 text-sm font-medium hover:bg-primary/20 transition"
              >
                <Typography variant="body">View Review Form</Typography>
              </button>
            )}

            {/* Actions */}
            {canPerformActions && actions?.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                {actions.map((action) => (
                  <button
                    key={action.name}
                    onClick={() => handleAction(action, { todo_id: todoId })}
                    className="w-full rounded-xl border border-blue-500 text-blue-600 py-2 text-sm font-semibold hover:bg-blue-500 hover:text-white transition-all"
                  >
                    {action.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {formSchema &&
        show &&
        createPortal(
          <ReivewForm onClose={() => setShow(false)}>
            <Form
              form={formSchema}
              options={{
                readOnly: true, // This makes the entire form read-only
                viewAsHtml: false, // Set to true to render as plain HTML instead of form inputs
              }}
              submit={false}
            />
          </ReivewForm>,
          document.body,
        )}
    </div>
  );
};

interface TimeLineBadgeProps {
  data: {
    icon: React.ElementType;
    color: string;
    bg: string;
    line: string;
  };
  isLastStage: boolean;
}

const TimeLineBadge = ({ data, isLastStage }: TimeLineBadgeProps) => {
  const Icon = data.icon;

  return (
    <div className="relative flex flex-col items-center h-full">
      {/* Icon Circle */}
      <div
        className={`w-10 h-10 rounded-full ${data.bg} flex items-center justify-center flex-shrink-0 `}
      >
        <Icon className={`w-4 h-4 ${data.color}`} />
      </div>

      {/* Vertical Line */}
      {!isLastStage && (
        <div
          className={`w-0.5 absolute top-10 h-[calc(90%)] ${data.line}`}
        ></div>
      )}
    </div>
  );
};

export default CardStages;
