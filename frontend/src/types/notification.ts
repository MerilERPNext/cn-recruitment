export interface NotificationAppCount {
  app: string;
  title: string;
  count: number;
  doctypes: string[];
}

export interface UnreadNotificationCountResponse {
  apps: NotificationAppCount[];
  total_count: number;
  doctypes: string[];
}
