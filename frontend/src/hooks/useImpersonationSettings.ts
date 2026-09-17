import { useQuery } from "@tanstack/react-query";
import { impersonationService } from "../services/impersonationService";
import { ImpersonationSettings } from "../types/impersonationSettings";

export const useImpersonationSettings = (options?: { enabled?: boolean }) => {
  return useQuery<ImpersonationSettings | null>({
    queryKey: ["impersonation-settings", "{show_dashboard, show_todo}"],
    queryFn: () => impersonationService.getImpersonationSettings(),
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000,
  });
};
