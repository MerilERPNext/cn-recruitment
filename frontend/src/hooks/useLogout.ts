import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { FrappeAPI } from "../utils/frappeAPI";

type LogoutResponse = void;
type LogoutError = unknown;

const performLogout = async (): Promise<LogoutResponse> => {
  await FrappeAPI.callMethod("logout");
};

export const useLogout = (): UseMutationResult<
  LogoutResponse,
  LogoutError,
  void
> => {
  return useMutation<LogoutResponse, LogoutError, void>({
    mutationKey: ["logout"],
    mutationFn: performLogout,
    onSuccess: () => {
      window.location.href = "/login";
    },
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export default useLogout;
