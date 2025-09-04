export interface NotificationLog {
    name: string;
    subject: string;
    for_user: string;
    type: string;
    read: number; // 0 = unread, 1 = read
    from_user: string;
    creation: string;
  }