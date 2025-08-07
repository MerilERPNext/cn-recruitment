import { useQuery } from "@tanstack/react-query";
import { frappeService } from "../services/frappeService";

export const usePolicyCountsByCategory = () => {
  return useQuery({
    queryKey: ["policy-counts"],
    queryFn: async () => {
      const result = await frappeService.getDocumentsPage({
        doctype: "HR Policies",
        filters: { archive: "0" },
        pageSize: 1000,
        pageParam: 0,
        searchTerm: "",
        fields: ["policy_category"],
        searchFields: [],
      });

      const counts: Record<string, number> = {};
      result.data.forEach(({ policy_category }) => {
        const key = String(policy_category);
        if (key) {
          counts[key] = (counts[key] || 0) + 1;
        }
      });

      return counts;
    },
  });
};
