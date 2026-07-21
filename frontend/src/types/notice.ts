export interface Notice {
  name: string;
  id: string;
  title: string;
  message: string;
  time: string;
  iconType: 'error' | 'campaign' | 'work' | 'badge' | 'event' | 'search';
  isUnread: boolean;
  priority: 'low' | 'medium' | 'high';
  action?: NoticeAction;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  category?: string;
  status: 'active' | 'archived' | 'dismissed';
}

export interface NoticeAction {
  label: string;
  type: 'view_task' | 'add_calendar' | 'dismiss' | 'approve' | 'reject' | 'view_details' | 'mark_as_read';
  variant: 'primary' | 'danger' | 'secondary';
  url?: string;
  data?: Record<string, Date>;
}

export interface NoticeListItem {
  id: string;
  title: string;
  message: string;
  time: string;
  iconType: string;
  isUnread: boolean;
  priority: string;
  action?: NoticeAction;
}

export interface NoticeFilters {
  status?: 'active' | 'archived' | 'dismissed';
  isUnread?: boolean;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  userId?: string;
}

export interface NoticeListResponse {
  data: Notice[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateNoticeData {
  title: string;
  message: string;
  iconType?: string;
  priority?: string;
  category?: string;
  action?: NoticeAction;
  targetUsers?: string[];
} 
export type NoticeStatusReadStatus = {
  name: string;
  owner: string;
  creation: string; 
  modified: string; 
  modified_by: string;
  docstatus: number;
  idx: number;
  notice: string;
  user: string;
  read_at: string; 
  acknowledged_at: string | null; 
  ip_address: string;
};
