import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalListServices } from "../services/approvalListService";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../context/OverlayContext";
import { useCallback } from "react";

export function useApprovalListActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, name }: { action: string; name: string }) =>
      approvalListServices.multiActionHandler(action, name),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}

export function useRevokeEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      docname,
      todo,
      doctype,
    }: {
      docname: string;
      todo: string;
      doctype: string;
    }) => approvalListServices.revokeEvent(docname, todo, doctype),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance-summary"] });
    },
    onError: (err) => {
      const formatedError = errorResponseFormater(err);
      toast.error(formatedError);
      console.log("Errorr Replacing Leave", err);
    },
  });
}

export type handleActionType = (action: string, data: {
  todo_id: string;
  custom_open_chatnext_assistant_on_action: boolean;
  custom_approval_type: "Approval Matrix" | "Multi Actions";
}, custom_action_message?: string | undefined) => Promise<void>;

export function useApprovalAction(triggerRefetch?: () => void) {

  const loading = useLoadingOverlay();
  const mutation = useApprovalListActions();
  const handleAction = useCallback(
    async (
      action: string,
      data: {
        todo_id: string;
        custom_open_chatnext_assistant_on_action: boolean;
        custom_approval_type: "Approval Matrix" | "Multi Actions";
      },
      custom_action_message?: string
    ) => {
      if (mutation?.isPending) return;

      const actionLoadingShow = ["approve", "reject"].includes(
        action.toLocaleLowerCase(),
      )
        ? action
        : `Performing Action: ${action}`;
      await loading?.wrap(async () => {
        try {

          const response = await mutation.mutateAsync({
            action,
            name: data?.todo_id || "",
          });

          console.log("Action response:", response);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason for using any
          const responseWithSession = response as unknown as { session?: any };
          console.log("Session data:", responseWithSession?.session);
          console.log(
            "Assistant trigger enabled:",
            data?.custom_open_chatnext_assistant_on_action,
          );

          if (
            (data?.custom_approval_type === "Approval Matrix" &&
              responseWithSession?.session) ||
            (data?.custom_approval_type === "Multi Actions" &&
              data?.custom_open_chatnext_assistant_on_action)
          ) {
            console.log(
              "Opening assistant with session:",
              responseWithSession?.session,
            );

            if (window.trigger_chatnext_assistant) {
              window.trigger_chatnext_assistant(
                true,
                responseWithSession?.session,
              );
            }

            if (action.toLowerCase() !== "approve") {
              triggerRefetch?.();
            }
          } else {
            // toast.success(`Request ${action} Successfully!`);
            const actionMap: Record<string, string> = {
              Approve: "Request Approved Successfully!",
              Reject: "Request Rejected Successfully!",
            };

            const finalAction = custom_action_message || actionMap[action] || `Action Performed Successfully`;

            toast.success(finalAction);
            triggerRefetch?.();
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any 
        } catch (error: any) {
          const formatedError = errorResponseFormater(
            error,
            "Something went wrong",
          );
          toast.error(formatedError);
          console.error("Action Falied:", error);
        }
      }, actionLoadingShow);
    },
    [mutation, loading, triggerRefetch],
  );

  return { handleAction };
}
