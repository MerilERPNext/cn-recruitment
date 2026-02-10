import CardTable from "../../shared/CardTable";
import { ApprovalStage } from "../../../types/todos";
import { Typography } from "../../shared/atoms/Typography";
import Badge from "../../shared/Badge";
import Button, { ButtonColor } from "../../shared/atoms/Button";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import { useMemo } from "react";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";

interface FlowDetailsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

const titles = [
  "Stage Number",
  "Stage Name",
  "Assigned To",
  "Action Taken By",
  "Status",
  "Trigger Date",
  "Due Date",
  "Actions",
];

const getActionStyles = (action: string): { bg: ButtonColor; text: string } => {
  const parsedAction = action.toLowerCase().trim();
  let styles = {
    bg: "disabled" as ButtonColor,
    text: "gray-600",
  };
  switch (parsedAction) {
    case "approve":
      styles = {
        bg: "success" as ButtonColor,
        text: "text-success-600",
      };
      break;
    case "reject":
      styles = {
        bg: "error" as ButtonColor,
        text: "text-error-600",
      };

      break;
    default:
      styles = {
        bg: "disabled" as ButtonColor,
        text: "text-gray-600",
      };
      break;
  }
  return styles;
};

const columnWidths = ["1fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr"];

const FlowDetails = ({ data }: FlowDetailsProps) => {
  console.log(data);

  return (
    <div className="mx-4">
      <CardTable titles={titles} columnWidths={columnWidths}>
        <div className="px-4">
          {data?.approval_stages_status.map(
            (stage: ApprovalStage, idx: number) => (
              <FlowDetailsCard idx={idx} stage={stage} data={data} />
            ),
          )}
        </div>
      </CardTable>
    </div>
  );
};

interface FlowDetailsCardProps {
  idx: number;
  stage: ApprovalStage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

const FlowDetailsCard = ({ idx, stage, data }: FlowDetailsCardProps) => {
  const triggerRefetch = () => {
    // TODO: trigeer refetch after action completed
  };
  const { handleAction } = useApprovalAction(triggerRefetch);
  const getBadgeColor = (status: string) => {
    if (!status) return "text-gray-600 bg-gray-100";

    switch (status.toLowerCase()) {
      case "approved":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const { data: userId } = useLoggedInUser();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(userId || "");

  const canPerformAction = useMemo(() => {
    if (
      stage.status !== "Pending" ||
      (idx !== 0 && data?.approval_stages_status[idx - 1].status === "Pending")
    )
      return false;
    let actionPermission = false;

    if (data?.allocated_to_emp_id && currentEmployee?.name)
      actionPermission = data.allocated_to_emp_id === currentEmployee.name;

    if (currentUser?.roles && data?.role)
      actionPermission ||= currentUser.roles.some(
        (role) => role.role === data.role,
      );

    return actionPermission;
  }, [stage, data, currentEmployee, currentUser, idx]);

  return (
    <div className="py-4 grid grid-cols-[repeat(7,1fr)_2fr] text-center items-center">
      <Typography variant="bodyMedium" className="card-subtitle">
        {idx + 1}
      </Typography>
      <Typography variant="bodyMedium" className="card-subtitle">
        <div>{stage?.stage_name || "stage name"}</div>
      </Typography>
      <Typography variant="bodyMedium" className="card-subtitle">
        <div>{stage?.user || "assigned to user"}</div>
      </Typography>
      <Typography variant="bodyMedium" className="card-subtitle">
        <div>{stage?.stage_name || "stage name"}</div>
      </Typography>
      <Badge
        label={stage?.status}
        backgroundColor={getBadgeColor(stage?.status)}
        textColor="mx-auto"
      />
      <Typography variant="bodyMedium" className="card-subtitle">
        <div>{stage?.stage_name || "stage name"}</div>
      </Typography>
      <Typography variant="bodyMedium" className="card-subtitle">
        <div>{stage?.stage_name || "stage name"}</div>
      </Typography>
      <Typography variant="bodyMedium" className="card-subtitle">
        <div className="flex sm:flex-row sm:justify-start gap-2 items-center">
          {canPerformAction &&
            actions?.length > 0 &&
            actions.map((action: string) => (
              <Button
                variant="soft"
                key={action}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAction(action, data);
                }}
                fullWidth
                bgColor={getActionStyles(action).bg}
              >
                {action}
              </Button>
            ))}
        </div>
      </Typography>
    </div>
  );
};

export default FlowDetails;
