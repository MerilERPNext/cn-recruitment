import { X } from "lucide-react";
import Avatar from "../shared/Avatar";
import { format } from "date-fns";
import { useCallback } from "react";
import { useApprovalListActions } from "../../hooks/userApprovalList";

export function AttendanceDetailView({
  data,
  onClose,
  onAction,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  onClose: () => void;
  onAction?: () => void;
}) {
  const mutation = useApprovalListActions();

  const handleAction = useCallback(
    async (action: string) => {
      try {
        if (mutation?.isPending) return;
        const response = await mutation?.mutateAsync({
          action,
          name: data?.name || "",
        });

        console.log("Action response:", response);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseWithSession = response as unknown as { session?: any };
        console.log("Session data:", responseWithSession?.session);
        console.log(
          "Assistant trigger enabled:",
          data?.custom_open_chatnext_assistant_on_action
        );

        if (
          (data?.custom_approval_type === "Approval Matrix" &&
            responseWithSession?.session) ||
          (data?.custom_approval_type === "Multi Actions" &&
            data?.custom_open_chatnext_assistant_on_action)
        ) {
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
        }
        if (onAction) {
          onAction();
        }
      } catch (error) {
        console.error("Action failed", error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const actions = data?.custom_doctype_actions
    ? JSON.parse(data?.custom_doctype_actions)
    : [];

  const getActionStyles = (action: string) => {
    const parsedAction = action.toLowerCase().trim();
    let styles = "";
    switch (parsedAction) {
      case "approve":
        styles =
          "w-full sm:w-auto px-3 sm:px-4 py-1.5 rounded-md bg-green-100 text-green-600 text-sm hover:bg-green-100 transition-colors border border-transparent hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed";
        break;
      case "reject":
        styles =
          "w-full sm:w-auto px-3 sm:px-4 py-1.5 rounded-md bg-red-100 text-red-600 text-sm hover:bg-red-100 transition-colors border border-transparent hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed";

        break;
      default:
        styles =
          "w-full sm:w-auto px-3 sm:px-4 py-1.5 rounded-md bg-gray-100 text-gray-600 text-sm hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed";
        break;
    }
    return styles;
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
              <Avatar name={data?.allocated_to} />
              <div>
                <h2 className="font-semibold text-gray-900">
                  {data?.allocated_to}
                </h2>
                {format(new Date(data?.date), "dd/MM/yyyy")}
              </div>{" "}
            </div>
          </div>
          {/* explanation */}
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-2">Description</p>
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-700">{data?.description}</p>
            </div>
          </div>
          {/* Date */}
        </div>

        {/* Actions */}
        {actions?.length > 0 && data?.status === "Open" && (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
              {actions?.length &&
                actions?.map((action: string) => (
                  <button
                    key={action}
                    onClick={() => {
                      handleAction(action);
                    }}
                    className={getActionStyles(action)}
                  >
                    {action}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;
}
