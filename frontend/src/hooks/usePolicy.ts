import { useQuery } from "@tanstack/react-query";
import { frappeService } from "../services/frappeService";

export const usePolicyCountsByCategory = () => {
  return useQuery({
    queryKey: ["policy-counts"],
    queryFn: async () => {
      try {
        console.log("🔍 Fetching Policy Details for category counts...");
        const result = await frappeService.getDocumentsPage({
          doctype: "Policy Details", // Using correct doctype name
          filters: {}, // Remove archive filter as it might not exist
          pageSize: 1000,
          pageParam: 0,
          searchTerm: "",
          fields: ["policy_category"],
          searchFields: [],
        });

        console.log("📊 Policy Details result:", result);
        console.log("📊 Policy Details data count:", result.data.length);

        if (result.data.length > 0) {
          console.log("📊 Sample policy item:", result.data[0]);
        }

        const counts: Record<string, number> = {};
        result.data.forEach((item: any) => {
          const category = item.policy_category;
          console.log("📊 Processing item category:", category);
          if (typeof category === "string" && category.trim() !== "") {
            counts[category] = (counts[category] || 0) + 1;
          }
        });

        console.log("📊 Final category counts:", counts);
        return counts;
      } catch (error) {
        console.warn("Failed to load policy counts, returning empty counts:", error);
        // Return empty counts instead of throwing
        return {};
      }
    },
    retry: 1, // Limit retries
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
