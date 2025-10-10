import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBenifitRequest,
  getClaimBenifitFor,
  getClaimBenifitMaxAmount,
} from "../services/benifitService";

export function useGetClaimBenifitFor(
  empId: string | null | undefined,
  date: string | null
) {
  return useQuery({
    queryKey: ["claim-benifits-for", empId, date],
    queryFn: () => getClaimBenifitFor(empId, date),
    enabled: !!empId && !!date,
  });
}
export function useGetClaimBenifitMaxAmount(
  empId: string | null | undefined,
  earning_component: string | null
) {
  return useQuery({
    queryKey: ["claim-benifits-for-max-amount", empId],
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
