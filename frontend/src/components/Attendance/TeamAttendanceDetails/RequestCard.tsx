import { format } from "date-fns";
import { RequestCardProps } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { useActionOnAttendanceRequest } from "../../../hooks/useAttendance";
import { useState } from "react";
import toast from "react-hot-toast";

export function RequestCard({
  request,
  isActionedCard = false,
  isSelected = false,
  onToggleSelect,
  onClick,
  onAction,
}: RequestCardProps & {
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onClick?: (request: RequestCardProps["request"]) => void;
}) {
  const mutation = useActionOnAttendanceRequest();
  const getStatus = (status: string) => {
    if (status === "Pending") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === "Approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-600",
      };
    } else if (status === "Rejected") {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-600",
      };
    }
  };

  const status = getStatus(request?.status);

  const [currentAction, setCurrentAction] = useState<
    "Approve" | "Reject" | null
  >(null);

  const handleAction = (
    action: "Approve" | "Reject",
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentAction(action);
    mutation.mutate(
      {
        todo_ids: request.todo_id,
        selected_action: action,
      },
      {
        onSettled: () => {
          setCurrentAction(null);
        },

        onSuccess: () => {
          if (onAction) {
            onAction();
          }
          toast.success(
            `Attendance request  ${
              action === "Reject" ? "rejecte" : action.toLowerCase()
            }d successfully!`
          );
        },
        onError: (error) => {
          toast.error(error?.message);
          console.error(error);
        },
      }
    );
  };
  return (
    <div
      className="cursor-pointer border border-gray-200 gap-3 bg-white shadow-sm transition-shadow rounded-xl"
      onClick={() => onClick?.(request)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 w-full">
          {!isActionedCard && (
            <input
              type="checkbox"
              className="mt-1 accent-blue-500"
              checked={isSelected}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onChange={() => onToggleSelect?.(request?.todo_id)}
            />
          )}
          <div className="w-full">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm text-gray-800">
                  {request?.employee_name}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(new Date(request?.from_date), "dd/MM/yyyy") ||
                    "--:--"}
                </p>
              </div>
              <Badge
                label={status?.label as string}
                backgroundColor={status?.statusColor}
              />
            </div>

            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              <span className="font-semibold">Reason:</span> {request.reason}
            </p>

            {!isActionedCard && (
              <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
                {" "}
                <button
                  className="w-full sm:w-auto px-3 sm:px-4 py-1.5 rounded-md bg-red-100 text-red-600 text-sm hover:bg-red-100 transition-colors border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={(e) => handleAction("Reject", e)}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && currentAction === "Reject"
                    ? "Rejecting..."
                    : "Reject"}
                </button>
                <button
                  className="w-full sm:w-auto px-3 sm:px-4 py-1.5 rounded-md bg-green-100 text-green-600 text-sm hover:bg-green-100 transition-colors border border-transparent hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={(e) => handleAction("Approve", e)}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && currentAction === "Approve"
                    ? "Approving..."
                    : "Approve"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
