import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalListServices } from "../services/approvalListService";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../utils/errorResponseFormater";

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
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (e) => {
      const formatedError = errorResponseFormater(e, "Could not Revoked the request");
      toast.error(formatedError);
      console.log(e);
    },
  });
}
