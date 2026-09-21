import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { NotificationService, NotificationAlertService } from "../services/notificationLogService";
import { NotificationLog } from "../types/notificationLog";
import { errorResponseFormater } from "../utils/errorResponseFormater";

export const useNotifications = (forUser: string | undefined, limit = 100, offset = 0, readFilter?: 0 | 1) => {
  return useQuery<NotificationLog[]>({
    queryKey: ["notifications", forUser, limit, offset, readFilter],
    queryFn: () => NotificationAlertService.getNotifications(forUser!, limit, offset, readFilter),
    enabled: !!forUser,
    refetchInterval: 30000,
    staleTime: Infinity,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"], refetchType: "all" });
    },
    onError: (error) => {
      toast.error(errorResponseFormater(error, "Failed to update notification"));
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (forUser?: string) => NotificationService.markAllAsRead(forUser),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"], refetchType: "all" });

      const count =
        typeof data === "number"
          ? data
          : typeof data?.message === "number"
          ? data.message
          : data?.message ?? data ?? 0;

      toast.success(`${count} notifications have been marked as read`);
    },
    onError: (error) => {
      toast.error(errorResponseFormater(error, "Failed to mark all as read"));
    },
  });
};