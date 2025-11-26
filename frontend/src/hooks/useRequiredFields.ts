import { useQuery } from "@tanstack/react-query"
import { requiredFieldsService } from "../services/requiredFieldsService"


export const useRequiredFields = (
  doctype_name: string
) => {
  return useQuery({
    queryKey: ["required-fields", doctype_name],
    queryFn: () => requiredFieldsService.getRequiredFields(doctype_name),
  })
}