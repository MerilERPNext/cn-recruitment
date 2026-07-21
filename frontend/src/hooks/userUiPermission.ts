import { useQuery } from "@tanstack/react-query";
import {
  permissionService,
  UiPermissionResponse,
} from "../services/permissionService";

export const useGetUiPermission = (appName?: string) => {
  return useQuery<UiPermissionResponse>({
    queryKey: ["ui-permission", appName ?? "all"],
    queryFn: () => permissionService.getUiPermission(appName),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
