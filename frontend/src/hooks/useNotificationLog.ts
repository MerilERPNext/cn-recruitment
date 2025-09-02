import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { NotificationService } from "../services/notificationLogService";

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-infinite", "Notification Log"] });
      toast.success("Marked as read");
    },
    onError: () => {
      toast.error("Failed to update notification");
    },
  });
};

