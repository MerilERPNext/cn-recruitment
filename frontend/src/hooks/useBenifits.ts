import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBenifitRequest,
  getClaimBenefitFor,
  getClaimBenifitMaxAmount,
} from "../services/benifitService";

export function useGetClaimBenefitFor(
  empId: string | null | undefined,
  date: string | null
) {
  return useQuery({
    queryKey: ["claim-benifits-for", empId, date],
    queryFn: () => getClaimBenefitFor(empId, date),
    enabled: !!empId && !!date,
  });
}
export function useGetClaimBenifitMaxAmount(
  empId: string | null | undefined,
  earning_component: string | null
) {
  return useQuery({
    queryKey: ["claim-benifits-for-max-amount", empId, earning_component],
    queryFn: () => getClaimBenifitMaxAmount(empId, earning_component),
    enabled: !!earning_component,
  });
}

export function useNewBenifitRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createBenifitRequest(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["benifit-request"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}
