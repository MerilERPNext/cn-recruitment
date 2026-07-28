import { useQuery } from "@tanstack/react-query";
import {
  permissionService,
  UiPermissionResponse,
} from "../services/permissionService";
import { useTargetUser } from "../context/ViewedUserContext";

export const useGetUiPermission = (appName?: string) => {
  const { targetEmployeeId } = useTargetUser();
  return useQuery<UiPermissionResponse>({
    // Permissions are evaluated per target on the backend via the
    // X-Target-Employee-Id header (e.g. "Employee Self" vs "Employee Manager"),
    // so the cache MUST vary by target. Without it, a permission resolved for
    // your own profile is reused when you open someone else's, letting a page
    // you're not allowed to view appear enabled.
    queryKey: ["ui-permission", appName ?? "all", targetEmployeeId ?? "self"],
    queryFn: () => permissionService.getUiPermission(appName),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
