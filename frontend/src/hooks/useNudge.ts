import { useMutation } from "@tanstack/react-query";
import { sendNudge } from "../services/nudgeService";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import toast from "react-hot-toast";

export const useNudge = () => {
  return useMutation({
    mutationFn: (todo: string | string[]) => sendNudge(todo),
    onSuccess: (res) => {
      if (res?.success === false) {
        toast.error(res.message || "Failed to send nudge");
      } else {
        toast.success(res?.message || "Nudge sent successfully");
      }
    },
    onError: (error) => {
      toast.error(errorResponseFormater(error, "Failed to send nudge"));
    },
  });
};
