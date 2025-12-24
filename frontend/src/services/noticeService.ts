/* eslint-disable @typescript-eslint/no-explicit-any */
import { FrappeAPI } from '../utils/frappeAPI';
import { Notice, NoticeUserActivity, UserNotice } from '../types/notice';
import { FilterCondition } from '../types/frappe';

// Notice API service
export class NoticeService {

  private readonly baseUrl = '/api/method/recruitment.api';

  async getAllNotices(limit?: number, filters?: FilterCondition[]): Promise<Notice[]> {
    try {
      const notices = await FrappeAPI.getDocumentList('Notice', { fields: ["*"], limit: limit, filters, orderBy: "creation desc" });

      return notices.data as Notice[];
    } catch (error) {
      console.error('📡 Error fetching notices:', error);
      throw error;
    }
  }

  async getUserNotices(): Promise<UserNotice[]> {
    try {
      const result = await FrappeAPI.callMethod(
        "nextai.nextai.doctype.notice.notice.get_user_notices",
      );

      return result as UserNotice[];
    } catch (error) {
      console.error("Error fetching current employee:", error);
      throw error;
    }
  }


  // Stub for getAllNoticeReadStatus
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAllNoticeReadStatus(_filters: any[]): Promise<any[]> {
    // TODO: Replace with real API call
    return [];
  }

  // Get a single notice by ID
  static async getNotice(noticeId: string): Promise<UserNotice | null> {
    try {
      const notice = await FrappeAPI.getDocument('Notice', noticeId);
      return notice as UserNotice;
    } catch (error) {
      console.error('Error fetching notice:', error);
      return null;
    }
  }

  // Mark notice as read
  async markAsRead(noticeId: string): Promise<boolean> {
    try {
      const response = await FrappeAPI.callMethod(`nextai.nextai.doctype.notice.notice.mark_notice_as_read`, {
        notice_name: noticeId
      });

      return !!response;
    } catch (error) {
      console.error('📡 Error marking notice as read:', error);
      return false;
    }
  }

  async markAsAcknowledge(noticeId: string): Promise<boolean> {
    try {
      const response = await FrappeAPI.callMethod(`nextai.nextai.doctype.notice.notice.mark_notice_as_acknowledged`, {
        notice_name: noticeId
      });

      return !!response;
    } catch (error) {
      console.error('📡 Error marking notice as read:', error);
      return false;
    }
  }
  async checkIfNoticeIsReadOrAcknowledged(noticeId: string): Promise<NoticeUserActivity[]> {
    try {
      const response = await FrappeAPI.getDocumentList(`Notice Read Status`, { filters: [["notice", "=", noticeId]], fields: ['*'] });
      return response?.data as unknown as NoticeUserActivity[];
    } catch (error) {
      console.error('📡 Error marking notice as read:', error);
      throw error;
    }
  }

  // Archive notice
  async archiveNotice(noticeId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}.archive_notice`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notice_id: noticeId }),
      });

      const result = await response.json();
      return response.ok && result.message === true;
    } catch (error) {
      console.error('📡 Error archiving notice:', error);
      return false;
    }
  }

  // Dismiss notice
  async dismissNotice(noticeId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}.dismiss_notice`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notice_id: noticeId }),
      });

      const result = await response.json();
      return response.ok && result.message === true;
    } catch (error) {
      console.error('📡 Error dismissing notice:', error);
      return false;
    }
  }

  // Get unread count
  async getUnreadNoticesCount(): Promise<number> {
    try {
      // const response = await fetch(`${this.baseUrl}.get_unread_notices_count`, {
      //   method: 'POST',
      //   headers: {
      //     'Accept': 'application/json',
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({}),
      // });

      // If all methods fail, return 0 as default
      console.warn('📡 All methods failed, returning default count of 0');
      return 0;

    } catch (error) {
      console.error('📡 Error fetching unread notices count:', error);
      return 0;
    }
  }

  // Transform Frappe document to Notice interface
  private static transformFromFrappe(doc: any): Notice {
    // The API already transforms the data, so we can use it directly
    // But we'll add a fallback for when getting single notices
    if (doc.iconType) {
      // Already transformed by API
      return doc;
    }

    // Transform for single notice fetch (not yet transformed by API)
    const createdDate = new Date(doc.publish_date || doc.creation);
    const relativeTime = this.getRelativeTime(createdDate);

    // Map notice type to icon type
    const iconTypeMap: Record<string, Notice['iconType']> = {
      'Emergency': 'error',
      'Alert': 'error',
      'Announcement': 'campaign',
      'Policy Update': 'work',
      'System Notice': 'badge',
      'Information': 'campaign'
    };

    // Map priority to our format
    const priorityMap: Record<string, Notice['priority']> = {
      'Critical': 'high',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low'
    };

    return {
      id: doc.name,
      name: doc.name,
      title: doc.title,
      message: doc.content || '',
      time: relativeTime,
      iconType: (iconTypeMap[doc.notice_type] as Notice['iconType']) || 'campaign',
      isUnread: !doc.read_at,
      priority: (priorityMap[doc.priority] as Notice['priority']) || 'medium',
      action: doc.allow_acknowledgment && !doc.acknowledged_at ? {
        label: 'Acknowledge',
        type: 'dismiss',
        variant: 'primary'
      } : undefined,
      createdAt: doc.publish_date || doc.creation,
      updatedAt: doc.modified,
      userId: doc.user_id,
      category: doc.notice_type,
      status: doc.status === 'Archived' ? 'archived' : 'active'
    };
  }

  // Calculate relative time
  private static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${diffInWeeks}w ago`;
  }
}

// Export a singleton instance
export const noticeService = new NoticeService();

// Default export for compatibility
export default NoticeService;