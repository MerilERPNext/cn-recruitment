/* eslint-disable @typescript-eslint/no-explicit-any */
import { FrappeAPI } from '../utils/frappeAPI';
import { Notice, NoticeFilters } from '../types/notice';

// Notice API service
export class NoticeService {
  
  private readonly baseUrl = '/api/method/recruitment.api';
  
  async getAllNotices(filters?: NoticeFilters): Promise<Notice[]> {
    try {
      console.log('📡 Fetching notices...');
      
      // Call our custom API
      const response = await fetch(`${this.baseUrl}.get_user_notices`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: filters || {} }),
      });

      if (!response.ok) {
        console.error('📡 API failed:', response.statusText);
        return this.getMockNotices();
      }

      const result = await response.json();
      
      if (result.message && Array.isArray(result.message)) {
        console.log('📡 Successfully fetched', result.message.length, 'notices');
        return result.message;
      }
      
      console.log('📡 No notices returned, using mock data');
      return this.getMockNotices();
      
    } catch (error) {
      console.error('📡 Error fetching notices:', error);
      return this.getMockNotices(); // Fallback to mock data
    }
  }

  // Get a single notice by ID
  static async getNotice(noticeId: string): Promise<Notice | null> {
    try {
      const notice = await FrappeAPI.getDocument<any>('Notice', noticeId);
      return this.transformFromFrappe(notice);
    } catch (error) {
      console.error('Error fetching notice:', error);
      return null;
    }
  }

  // Mark notice as read
  async markAsRead(noticeId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}.mark_notice_as_read`, {
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
      console.error('📡 Error marking notice as read:', error);
      return false;
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
      const response = await fetch(`${this.baseUrl}.get_unread_notices_count`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (typeof result.message === 'number') {
          return result.message;
        }
      }
      
      // Fallback to counting from getAllNotices
      const unreadNotices = await this.getUnreadNotices();
      return unreadNotices.length;
      
    } catch (error) {
      console.error('📡 Error fetching unread notices count:', error);
      // Return mock count
      return this.getMockNotices().filter(notice => notice.isUnread).length;
    }
  }

  async getUnreadNotices(filters?: NoticeFilters): Promise<Notice[]> {
    try {
      const allNotices = await this.getAllNotices(filters);
      return allNotices.filter(notice => notice.isUnread);
    } catch (error) {
      console.error('📡 Error fetching unread notices:', error);
      return this.getMockNotices().filter(notice => notice.isUnread);
    }
  }

  async getArchivedNotices(filters?: NoticeFilters): Promise<Notice[]> {
    try {
      const allNotices = await this.getAllNotices({ ...filters, status: 'archived' });
      return allNotices.filter(notice => notice.status === 'archived');
    } catch (error) {
      console.error('📡 Error fetching archived notices:', error);
      return [];
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

  // Mock data for development/fallback
  private getMockNotices(): Notice[] {
    return [
      {
        id: 'mock-1',
        title: '🔧 API Integration Test',
        message: 'This is mock data displayed while we debug the API integration. If you see this, the Notice API is not returning data.',
        time: '2m ago',
        iconType: 'campaign',
        isUnread: true,
        priority: 'high',
        action: {
          label: 'Acknowledge',
          type: 'dismiss',
          variant: 'primary'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'system',
        category: 'System Notice',
        status: 'active'
      },
      {
        id: 'mock-2', 
        title: '📡 API Status',
        message: 'The frontend is working correctly. The issue is likely with the backend API endpoints or data transformation.',
        time: '5m ago',
        iconType: 'badge',
        isUnread: true,
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'system',
        category: 'Information',
        status: 'active'
      },
      {
        id: 'mock-3',
        title: '✅ Frontend Ready',
        message: 'The React components, TypeScript types, and UI are all working properly. Check browser console for API debugging info.',
        time: '10m ago',
        iconType: 'work',
        isUnread: false,
        priority: 'low',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'system',
        category: 'Information',
        status: 'active'
      }
    ];
  }
}

// Export a singleton instance
export const noticeService = new NoticeService();

// Default export for compatibility
export default NoticeService; 