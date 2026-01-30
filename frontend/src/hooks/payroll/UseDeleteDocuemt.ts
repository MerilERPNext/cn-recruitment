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
      console.log(`✅ Deleted ${variables.doctype} - ${variables.name}`);

      queryClient.invalidateQueries({
        queryKey: [variables.doctype],
      });
    },

    onError: (error: any) => {
      console.error(
        "❌ Delete failed:",
        error?.response?.data || error.message
      );
    },
  });
};

