import { useInfiniteQuery } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";
import { SelectOption } from "../components/shared/atoms/Select"; // wait, Select doesn't export SelectOption currently, I will just define it locally

export interface UseLinkFieldOptionsParams {
    doctype: string;
    searchText?: string;
    filters?: Record<string, any>;
    enabled?: boolean;
}

export const useLinkFieldOptions = ({ doctype, searchText = "", filters, enabled = true }: UseLinkFieldOptionsParams) => {
    return useInfiniteQuery({
        queryKey: ["link-field-options", doctype, searchText, filters],
        queryFn: async ({ pageParam = 0 }) => {
            const res = await FrappeAPI.callMethod("recruitment.api.job_requisition.get_link_field_options", {
                doctype,
                search_text: searchText,
                limit: 20,
                skip: pageParam,
                ...(filters || {})
            });
            return res?.data?.message || res?.data || [];
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === 20 ? allPages.length * 20 : undefined;
        },
        enabled: enabled && !!doctype,
    });
};
