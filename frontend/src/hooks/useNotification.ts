import { useQuery } from "@tanstack/react-query";
import { notificationService } from "../services/notificationService";
import { UnreadNotificationCountResponse } from "../types/notification";

export const useGetUnreadNotificationCount = (
  userEmail: string | undefined
) => {
  return useQuery<UnreadNotificationCountResponse>({
    queryKey: ["unread-notification-count", userEmail],
    queryFn: async () => {
      if (!userEmail) {
        throw new Error("User email is required");
      }
      const data = await notificationService.getUnreadNotificationCount(userEmail);
      return data;
    },
    enabled: !!userEmail,
    staleTime: 60 * 1000, // 1 minute
  });
};
