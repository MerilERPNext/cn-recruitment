// services/scheduledImportsService.ts
import type { ScheduledDataImport } from "../types/scheduledImports";
import { FrappeAPI } from "../utils/frappeAPI";

const DOCTYPE = "Scheduled Data Import";

export const scheduledImportsService = {
  getImportsByOwner: async (
    owner: string,
    monthFilter?: string,
    limitPageLength = 1000,
  ): Promise<ScheduledDataImport[]> => {
    try {
      const filters: any[] = [["owner", "=", owner]];
      if (monthFilter) {
        const [year, month] = monthFilter.split("-");
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(Number(year), Number(month), 0);
        const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, "0")}`;
        filters.push(["creation", "between", [startDate, endDate]]);
      }

      const response = await FrappeAPI.getDocumentList(DOCTYPE, {
        fields: ["*"],
        filters: filters,
        limit: limitPageLength,
        orderBy: "creation desc",
      });

      return (response.data as ScheduledDataImport[]) ?? [];
    } catch (error) {
      console.error("❌ Failed to fetch Scheduled Data Imports:", error);
      throw error;
    }
  },
};
