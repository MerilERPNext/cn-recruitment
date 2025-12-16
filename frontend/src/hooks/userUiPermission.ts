import { useQuery } from "@tanstack/react-query";
import {
  permissionService,
  UiPermissionResponse,
} from "../services/permissionService";

export const useGetUiPermission = () => {
  return useQuery<UiPermissionResponse>({
    queryKey: ["ui-permission"],
    queryFn: () => permissionService.getUiPermission(),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
};
