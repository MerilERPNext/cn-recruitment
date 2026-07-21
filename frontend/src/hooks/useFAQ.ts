import { useQuery } from "@tanstack/react-query";
import { FrappeAPI } from "../utils/frappeAPI";

export interface FAQCategory {
  name: string;
  category_name: string;
  article_count: number;
}

export interface FAQArticle {
  name: string;
  title: string;
  content: string;
  published_on: string;
  modified: string;
  author: string;
}

// Retry logic
const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("permission") ||
    error.message.includes("403") ||
    error.message.includes("Access Restricted"));

const defaultRetry = (failureCount: number, error: unknown) => {
  if (isPermissionError(error)) return false;
  return failureCount < 3;
};

const defaultQueryOptions = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
  retry: defaultRetry,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 30000),
};

/**
 * Fetch all FAQ categories with article counts
 */
export const useCategories = () => {
  return useQuery<FAQCategory[]>({
    queryKey: ["faq-categories"],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod(
        "helpdesk.api.knowledge_base.get_categories"
      );
      return result as FAQCategory[];
    },
    ...defaultQueryOptions,
  });
};

/**
 * Fetch articles for a specific category
 */
export const useCategoryArticles = (category: string) => {
  return useQuery<FAQArticle[]>({
    queryKey: ["faq-articles", category],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod(
        "helpdesk.api.knowledge_base.get_category_articles",
        { category }
      );
      return result as FAQArticle[];
    },
    enabled: !!category,
    ...defaultQueryOptions,
  });
};

/**
 * Search articles by query
 */
export const useSearchArticles = (query: string) => {
  return useQuery<FAQArticle[]>({
    queryKey: ["faq-search", query],
    queryFn: async () => {
      const result = await FrappeAPI.callMethod(
        "helpdesk.api.article.search",
        { query }
      );
      return result as FAQArticle[];
    },
    enabled: query.length > 2,
    ...defaultQueryOptions,
  });
};
