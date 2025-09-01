import { Check, X } from "lucide-react";
import Avatar from "../shared/Avatar";
import { AttendanceRequest } from "../../types/attendance";
import { format } from "date-fns";
import { useActionOnAttendanceRequest } from "../../hooks/useAttendance";
import { useState } from "react";
import toast from "react-hot-toast";
import { formatTimeSafe } from "../../utils/helperUtils";

export function AttendanceDetailView({
  data,
  onClose,
  onAction,
}: {
  data: AttendanceRequest;
  onClose: () => void;
  onAction?: () => void;
}) {
  const mutation = useActionOnAttendanceRequest();

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
        todo_ids: data.todo_id,
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
            `Attendance request ${action.toLowerCase()}d successfully!`
          );
        },

        onError: (error) => {
          toast.error(error?.message);
          console.error(error);
        },
      }
    );
  };

  return data?.name ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4   border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Attendance Request
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-32 md:pb-6">
          {/* Employee Info */}
          <div className="py-4 border-b">
            <div className="flex items-center space-x-3">
              <Avatar name={data?.employee_name} />
              <div>
                <h2 className="font-semibold text-gray-900">
                  {data?.employee_name}
                </h2>
                <p className="text-sm text-gray-500">{data?.department}</p>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="py-4 border-b">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">From Date</p>
                <p className="font-medium">
                  {format(new Date(data?.from_date), "dd/MM/yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">To Date</p>
                <p className="font-medium">
                  {format(new Date(data?.to_date), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
            <div className="flex justify-between mt-2 pr-3">
              <div>
                <p className="text-sm text-gray-500">From Time</p>
                <p className="font-medium ">
                  {formatTimeSafe(data?.custom_from_time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">To Time</p>
                <p className="font-medium">
                  {formatTimeSafe(data?.custom_to_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Log Details */}
          <div className="py-4 border-b">
            <p className="text-sm text-gray-500 mb-3">Log Details</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Check In</p>
                    <p className="text-xs text-gray-500">
                      {data?.custom_checkin_type || ""}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {formatTimeSafe(data?.custom_in_time)}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="h-3 w-3 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Check Out</p>
                    <p className="text-xs text-gray-500">
                      {data?.custom_checkout_time || ""}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {formatTimeSafe(data?.custom_out_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="py-4 border-b">
            <p className="text-sm text-gray-500 mb-2">Reason</p>
            <div className="">
              <p className="text-sm text-gray-700 font-medium">
                {data?.reason}
              </p>
            </div>
          </div>

          {/* explanation */}
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-2">Explanation</p>
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-700">{data?.explanation}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {data?.status === "Pending" && (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            <div className="flex space-x-2 w-full">
              <button
                className="w-1/2 px-3 py-2 rounded-md bg-red-100 text-red-600 text-sm hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => handleAction("Reject", e)}
                disabled={mutation.isPending}
              >
                {mutation.isPending && currentAction === "Reject"
                  ? "Rejecting..."
                  : "Reject"}
              </button>
              <button
                className="w-1/2 px-3 py-2 rounded-md bg-green-100 text-green-600 text-sm hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => handleAction("Approve", e)}
                disabled={mutation.isPending}
              >
                {mutation.isPending && currentAction === "Approve"
                  ? "Approving..."
                  : "Approve"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;
}
