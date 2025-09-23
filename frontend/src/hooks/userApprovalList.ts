import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalListServices } from "../services/approvalListService";

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
    mutationFn: async ({ docname, todo }: { docname: string; todo: string }) =>
      approvalListServices.revokeEvent(docname, todo),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}
