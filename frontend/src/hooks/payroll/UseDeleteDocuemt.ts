/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDocument } from "../../services/payrollApi/DeleteDocumentService";

type DeletePayload = {
  doctype: string;
  name: string;
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ doctype, name }: DeletePayload) =>
      deleteDocument(doctype, name),

    onSuccess: (_data, variables) => {
      console.log(
        `✅ Deleted ${variables.doctype} - ${variables.name}`
      );

      // 🔄 invalidate common list queries (adjust keys as needed)
      queryClient.invalidateQueries({ queryKey: [variables.doctype] });
      queryClient.invalidateQueries({ queryKey: ["loan"] }); // example (like your loan hook)
    },

    onError: (error: any) => {
      console.error(
        "❌ Delete failed:",
        error?.response?.data || error.message
      );
    },
  });
};
