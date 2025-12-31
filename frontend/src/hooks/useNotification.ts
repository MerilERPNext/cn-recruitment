import { useQuery } from "@tanstack/react-query";
import { notificationService } from "../services/notificationService";
import { UnreadNotificationCountResponse } from "../types/notification";

export const useGetUnreadNotificationCount = (
  userEmail: string | undefined
) => {
  return useQuery<UnreadNotificationCountResponse>({
    queryKey: ["unread-notification-count", userEmail],
    queryFn: () => {
      if (!userEmail) {
        throw new Error("User email is required");
      }
      return notificationService.getUnreadNotificationCount(userEmail);
    },
    enabled: !!userEmail,
    staleTime: 60 * 1000, // 1 minute
  });
};
