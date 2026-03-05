import { useMutation, useQuery } from "@tanstack/react-query";
import { EditITDeclarationService, getEditValueITDeclaration } from "../../services/payrollApi/editITDeclaration";
type EditITDeclarationValue = {
    employee: string;
    company: string;
    payroll_period: string;
    frequency_type: string;
    release_config: string;
    individual_start_date: string;
    individual_end_date: string;
    active: number;
    status: "Open" | "Closed";
    type: string;
  };

export const useEditITDeclaration = () => {
  return useMutation({
    mutationFn: (payload: {
      empdoc_id: string | null;
      declaration_type: string;
      status: string;
      from_date: string;
      to_date: string;
    }) => EditITDeclarationService.submit(payload),
  });
};

export const useEditValueITDeclaration = (empdoc_id: string | null) => {
    return useQuery<EditITDeclarationValue>({
      queryKey: ["edit-it-declaration", empdoc_id],
      queryFn: () => getEditValueITDeclaration(empdoc_id),
      enabled: !!empdoc_id,
    });
  };