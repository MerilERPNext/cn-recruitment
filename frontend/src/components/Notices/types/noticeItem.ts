
export interface BaseItem {
  name: string;
  id?: string;
  [key: string]: unknown;
}

export interface NoticeItem extends BaseItem, Notice {
  id: string;
}

export interface NoticeAction {
  type: string;
  label: string;
  variant?: 'primary' | 'danger' | 'secondary';
}

export interface Notice {
  name: string;
  id?: string;
  title: string;
  message?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'active' | 'archived' | 'dismissed';
  category?: string;
  iconType?: string;
  createdAt?: string;
  updatedAt?: string;
  isUnread?: boolean;
  action?: NoticeAction;
}
