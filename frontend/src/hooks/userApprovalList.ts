import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalListServices } from "../services/approvalListService";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import toast from "react-hot-toast";

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
