import { useInfiniteQuery } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";

export interface UseLinkFieldOptionsParams {
  doctype: string;
  searchText?: string;
  limit?: number;
  filters?: Record<string, any>;
  enabled?: boolean;
}

export const useLinkFieldOptions = ({
  doctype,
  searchText = "",
  limit = 20,
  filters,
  enabled = true,
}: UseLinkFieldOptionsParams) => {
  return useInfiniteQuery({
    queryKey: ["link-field-options", doctype, searchText, limit, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const res: any = await FrappeAPI.callMethod(
        "recruitment.api.job_requisition.get_link_field_options",
        {
          doctype,
          search_text: searchText,
          limit,
          skip: pageParam,
          ...(filters || {}),
        }
      );
      return res;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const results =
        lastPage?.results ||
        lastPage?.message?.results ||
        (Array.isArray(lastPage) ? lastPage : []);

      return results.length === limit ? allPages.length * limit : undefined;
    },
    enabled: enabled && !!doctype,
  });
};
