import { useGetUnreadNotificationCount } from "./useNotification";
import { NOTIFICATION_TITLE_MAP } from "../utils/helperUtils";
import useCurrentUser from "./useCurrentUser";

export const useAppNotificationCounts = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: notificationData } = useGetUnreadNotificationCount(
    currentUser?.name
  );

  const getCount = (uiLabel: string) => {
    if (!notificationData?.apps) return 0;

    const backendTitles = NOTIFICATION_TITLE_MAP[uiLabel];
    if (!backendTitles) return 0;

    return notificationData.apps
      .filter((app) => backendTitles.includes(app.title))
      .reduce((sum, app) => sum + (app.count ?? 0), 0);
  };

  const getCountByBackendTitle = (backendTitle?: string) => {
    if (!backendTitle || !notificationData?.apps) return 0;

    return (
      notificationData.apps.find((app) => app.title === backendTitle)?.count ??
      0
    );
  };

  return {
    getCount,
    getCountByBackendTitle,
  };
};
