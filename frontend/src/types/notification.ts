export interface NotificationDoctypeCount {
  doctype: string;
  self: number;
  allocated: number;
}

export interface NotificationAppCount {
  app: string;
  title: string;
  count?: number; // Kept for backward compatibility if needed, though typically not used with detailed breakdown
  doctypes: NotificationDoctypeCount[];
}

export type UnreadNotificationCountResponse = NotificationAppCount[];
