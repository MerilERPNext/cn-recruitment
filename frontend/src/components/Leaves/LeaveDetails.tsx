import { X } from "lucide-react";
import Avatar from "../shared/Avatar";
import { format } from "date-fns";
import { useCallback } from "react";
import { useApprovalListActions } from "../../hooks/userApprovalList";
import DOMPurify from "dompurify";

export function LeaveDetailView({
  data,
  onClose,
  onAction,
  loadingAction,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  onClose: () => void;
  onAction?: () => void;
  loadingAction?: { id: string; action: string } | null;
}) {
  const mutation = useApprovalListActions();
  const cleanDescription = DOMPurify.sanitize(data?.description || "");

  const handleAction = useCallback(
    async (action: string) => {
      try {
        if (mutation?.isPending) return;
        const response = await mutation?.mutateAsync({
          action,
          name: data?.name || "",
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseWithSession = response as unknown as { session?: any };

        if (
          (data?.custom_approval_type === "Approval Matrix" &&
            responseWithSession?.session) ||
          (data?.custom_approval_type === "Multi Actions" &&
            data?.custom_open_chatnext_assistant_on_action)
        ) {
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
        <div className="flex items-center justify-between px-4 py-4   border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">Leave Request</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-32 md:pb-6">
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

          <div className="py-4">
            <p className="text-sm text-gray-500 mb-2">Description</p>
            <div className="bg-gray-100 p-3 rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: cleanDescription }} />
            </div>
          </div>
        </div>

        {actions?.length > 0 && data?.status === "Open" && (
          <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
            <div className="flex sm:flex-row sm:justify-start gap-2 mt-3">
              {actions?.length &&
                actions?.map((action: string) => {
                  const isLoading =
                    loadingAction?.id === data?.name &&
                    loadingAction?.action === action;
                  return (
                    <button
                      key={action}
                      disabled={isLoading}
                      onClick={() => {
                        handleAction(action);
                      }}
                      className={getActionStyles(action)}
                    >
                      {isLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        action
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;
}
