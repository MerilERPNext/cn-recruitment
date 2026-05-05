import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { NotificationService, NotificationAlertService } from "../services/notificationLogService";
import { NotificationLog } from "../types/notificationLog";

export const useNotifications = (limit = 100, offset = 0, readFilter?: 0 | 1) => {
  return useQuery<NotificationLog[]>({
    queryKey: ["notifications", limit, offset, readFilter],
    queryFn: () => NotificationAlertService.getNotifications(limit, offset, readFilter),
    refetchInterval: 30000,
    staleTime: Infinity,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to update notification");
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => NotificationService.markAllAsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to mark all as read");
    },
  });
};