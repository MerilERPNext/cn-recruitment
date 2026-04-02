import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NoticeService } from '../services/noticeService';
import type { Notice, NoticeFilters } from '../types/notice';
import { FilterCondition } from '../types/frappe';

// Create a service instance
const noticeService = new NoticeService();

// Query keys
const QUERY_KEYS = {
  notices: ['notices'] as const,
  unreadCount: ['notices', 'unread-count'] as const,
  allNotices: (filters?: NoticeFilters) => ['notices', 'all', filters] as const,
  unreadNotices: (filters?: NoticeFilters) => ['notices', 'unread', filters] as const,
  archivedNotices: (filters?: NoticeFilters) => ['notices', 'archived', filters] as const,
  userNotices: (filters?: NoticeFilters) => ['notices', 'user', filters] as const,
};

// Hook to get unread count
export function useGetAllNotices(limit?: number, filters?: FilterCondition[]) {
  return useQuery({
    queryKey: QUERY_KEYS.allNotices(),
    queryFn: () => noticeService.getAllNotices(limit, filters),
    staleTime: 2 * 60 * 1000, // 2 minutes - count can be slightly more frequent
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes instead of 1 minute
    refetchOnWindowFocus: false, // Disable focus refetch
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
export function useGetUserNotices() {
  return useQuery({
    queryKey: QUERY_KEYS.userNotices(),
    queryFn: () => noticeService.getUserNotices(),
    staleTime: 2 * 60 * 1000, // 2 minutes - count can be slightly more frequent
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes instead of 1 minute
    refetchOnWindowFocus: false, // Disable focus refetch
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
export function useUnreadNoticesCount() {
  return useQuery({
    queryKey: QUERY_KEYS.unreadCount,
    queryFn: () => noticeService.getUnreadNoticesCount(),
    staleTime: 2 * 60 * 1000, // 2 minutes - count can be slightly more frequent
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes instead of 1 minute
    refetchOnWindowFocus: false, // Disable focus refetch
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}

// Hook to mark notice as read
export function useMarkNoticeAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noticeId: string) => noticeService.markAsRead(noticeId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notices });
    },
    onMutate: async (noticeId: string) => {
      // Optimistically update the cache
      const allNoticesQueries = queryClient.getQueriesData({ queryKey: ['notices', 'all'] });
      const unreadNoticesQueries = queryClient.getQueriesData({ queryKey: ['notices', 'unread'] });

      // Update all notices queries
      allNoticesQueries.forEach(([queryKey, oldData]) => {
        if (oldData && Array.isArray(oldData)) {
          const newData = oldData.map((notice: Notice) =>
            notice.id === noticeId ? { ...notice, isUnread: false } : notice
          );
          queryClient.setQueryData(queryKey, newData);
        }
      });

      // Update unread notices queries
      unreadNoticesQueries.forEach(([queryKey, oldData]) => {
        if (oldData && Array.isArray(oldData)) {
          const newData = oldData.filter((notice: Notice) => notice.id !== noticeId);
          queryClient.setQueryData(queryKey, newData);
        }
      });

      // Update unread count
      queryClient.setQueryData(QUERY_KEYS.unreadCount, (oldCount: number = 0) =>
        Math.max(0, oldCount - 1)
      );
    },
  });
}

// Hook to mark notice as acknowledge
export function useMarkNoticeAsAcknowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noticeId: string) => noticeService.markAsAcknowledge(noticeId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notices });
    },
  });
}

// Hook to archive notice
export function useArchiveNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noticeId: string) => noticeService.archiveNotice(noticeId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notices });
    },
  });
}


export function useGetNoticeById(noticeId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.notices, noticeId],
    queryFn: () => NoticeService.getNotice(noticeId), // keep static usage, as getNotice is static
    enabled: !!noticeId, // avoids firing when ID is undefined
  });
}
export function useCheckIfNoticeIsReadOrAcknowledged(noticeId: string, user: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.notices, noticeId, 'readOrAcknowledged', user],
    queryFn: () => noticeService.checkIfNoticeIsReadOrAcknowledged(noticeId, user), // keep static usage, as getNotice is static
    enabled: !!noticeId && !!user, // avoids firing when ID or user is undefined
  });
}

export function useGetAllNoticeReadStatus(filters: FilterCondition[], enabled: boolean) {
  return useQuery({
    queryKey: [QUERY_KEYS.notices],
    queryFn: () => noticeService.getAllNoticeReadStatus(filters),
    enabled: enabled,
  });
}

// Hook to dismiss notice
export function useDismissNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noticeId: string) => noticeService.dismissNotice(noticeId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notices });
    },
    onMutate: async (noticeId: string) => {
      // Optimistically remove from all queries
      const noticesQueries = queryClient.getQueriesData({ queryKey: ['notices'] });

      noticesQueries.forEach(([queryKey, oldData]) => {
        if (oldData && Array.isArray(oldData)) {
          const newData = oldData.filter((notice: Notice) => notice.id !== noticeId);
          queryClient.setQueryData(queryKey, newData);
        }
      });

      // Update unread count if the notice was unread
      const unreadNotices = queryClient.getQueryData<Notice[]>(QUERY_KEYS.unreadNotices());
      if (unreadNotices?.some(notice => notice.id === noticeId)) {
        queryClient.setQueryData(QUERY_KEYS.unreadCount, (oldCount: number = 0) =>
          Math.max(0, oldCount - 1)
        );
      }
    },
  });
} 