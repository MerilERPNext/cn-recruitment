import { useQuery } from "@tanstack/react-query";
import { frappeService } from "../services/frappeService";

export const usePolicyCountsByCategory = (employeeId?: string) => {
  return useQuery({
    queryKey: ["policy-counts", employeeId],
    queryFn: async () => {
      try {
        console.log("🔍 Fetching Policy Details for category counts...");

        const filters: Record<string, any> = { status: ["!=", ""] };
        if (employeeId) {
          filters.employee_id = employeeId;
        }

        const result = await frappeService.getDocumentsPage({
          doctype: "Policy Details",
          filters,
          pageSize: 1000,
          pageParam: 0,
          searchTerm: "",
          fields: ["policy_category", "name", "status", "employee_id"],
          searchFields: [],
        });

        console.log("📊 Raw Policy Data:", result.data);

        const counts: Record<string, number> = {};
        const categoriesSet = new Set<string>();

        result.data.forEach((item: any) => {
          const category = item.policy_category;

          if (typeof category === "string" && category.trim() !== "") {
            // ✅ Always store category
            categoriesSet.add(category);

            // ✅ Count ONLY Acknowledged policies
            if (item.status === "Acknowledged") {
              counts[category] = (counts[category] || 0) + 1;
            }
          }
        });

        // ✅ Ensure categories with only archived items show count = 0
        categoriesSet.forEach((category) => {
          if (!(category in counts)) {
            counts[category] = 0;
          }
        });

        console.log("📊 Final Category Counts:", counts);
        return counts;
      } catch (error) {
        console.warn("⚠️ Failed to load policy counts:", error);
        return {};
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    enabled: !!employeeId,
  });
};
