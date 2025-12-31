import { useQuery } from "@tanstack/react-query";
import { getITDecalarationData, getNewRegime } from "../../services/payrollApi/itDeclarationService";


export function useNewRegime(employee: string | null, company: string | null) {
    return useQuery({
      queryKey: ["new-regime", employee, company],
      queryFn: () => getNewRegime(employee, company),
    });
  }

export function useITDeclarationTabData(goHeadValue: boolean, employee: string | null, company: string | null) {
    return useQuery({
      queryKey: ["income-tax-sheet", goHeadValue, employee, company],
      queryFn:() => getITDecalarationData(goHeadValue, employee, company,),
    });
  }