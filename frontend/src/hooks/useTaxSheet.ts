import { useQuery } from "@tanstack/react-query";
import { getTaxSheetData } from "../services/taxSheetService";

export function useTaxSheetData(
  employee_id: string | null) {
    return useQuery({
      queryKey: ["tax-sheet", employee_id,],
      queryFn: () => getTaxSheetData(employee_id),
      enabled: !!employee_id,
    });
  }