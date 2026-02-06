import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { NotificationService } from "../services/notificationLogService";
import { useQuery } from "@tanstack/react-query";
import { NotificationAlertService } from "../services/notificationLogService";
import { NotificationLog } from "../types/notificationLog";


export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),

    onSuccess: () => {
      // 🔥 This must match useNotifications queryKey
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      toast.success("Marked as read");
    },

    onError: () => {
      toast.error("Failed to update notification");
    },
  });
};




export const useNotifications = () => {
  return useQuery<NotificationLog[]>({
    queryKey: ["notifications"],
    queryFn: NotificationAlertService.getNotifications,
    refetchInterval: 10000,
  });
};
