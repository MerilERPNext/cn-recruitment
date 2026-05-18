// services/scheduledImportsService.ts
import type { ScheduledDataImport } from "../types/scheduledImports";
import { FrappeAPI } from "../utils/frappeAPI";

const DOCTYPE = "Scheduled Data Import";

export const scheduledImportsService = {
  getImportsByOwner: async (
    owner: string,
    limitPageLength = 100,
  ): Promise<ScheduledDataImport[]> => {
    try {
      const response = await FrappeAPI.getDocumentList(DOCTYPE, {
        fields: ["*"],
        filters: [["owner", "=", owner]],
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
