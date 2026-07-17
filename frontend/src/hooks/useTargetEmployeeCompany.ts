import { useQuery } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";
import { useTargetUser } from "../context/ViewedUserContext";

/**
 * Resolve the currently-viewed (switch-user) employee's company.
 *
 * When a target user is active (viewing another employee via "switch user"),
 * API payloads that are company-scoped must use the TARGET employee's company,
 * not the logged-in user's. This hook fetches that company deterministically
 * from the Employee doctype.
 *
 * The query key (`["target-employee-company", targetEmployeeId]`) is shared with
 * the payroll-period lookup, so switching to a user that was already resolved
 * elsewhere on the page hits the cache instead of refetching.
 *
 * Returns `targetCompany: null` when no target user is active (or until it
 * resolves); `isResolving` is true only while a target's company is loading.
 */
export function useTargetEmployeeCompany(): {
  targetCompany: string | null;
  isResolving: boolean;
} {
  const { targetEmployeeId } = useTargetUser();

  const { data, isLoading } = useQuery({
    queryKey: ["target-employee-company", targetEmployeeId],
    queryFn: async () => {
      const res = await FrappeAPI.getDocumentList("Employee", {
        fields: ["name", "company"],
        filters: [["name", "=", targetEmployeeId as string]],
        limit: 1,
      });
      return (
        (res.data?.[0] as { company?: string } | undefined)?.company ?? null
      );
    },
    enabled: !!targetEmployeeId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    targetCompany: targetEmployeeId ? data ?? null : null,
    isResolving: !!targetEmployeeId && isLoading,
  };
}

export default useTargetEmployeeCompany;
