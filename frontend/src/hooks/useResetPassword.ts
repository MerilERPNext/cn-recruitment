import { useMutation } from "@tanstack/react-query";
import { requestPasswordReset, updatePasswordViaKey } from "../services/resetPasswordService";


export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  });
};


export const useUpdatePasswordViaKey = () => {
  return useMutation({
    mutationFn: (payload: { key: string; new_password: string }) =>
      updatePasswordViaKey(payload),
  });
};
