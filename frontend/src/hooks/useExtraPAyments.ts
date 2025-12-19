import { useQuery } from "@tanstack/react-query";
import { getExtraPayments } from "../services/extraPaymentService";

export function useExtraPayment(
 company: string | null, employee_id: string | null) {
    return useQuery({
      queryKey: ["extra-payments", employee_id, company,],
      queryFn: () => getExtraPayments(employee_id, company),
      enabled: !!employee_id && !!company,
    });
  }