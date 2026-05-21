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

  downloadErrorReport: async (item: ScheduledDataImport): Promise<void> => {
    // Determine file format from the original file_to_import extension
    const filePath = item.file_to_import || "";
    const ext = filePath.split(".").pop()?.toUpperCase() || "CSV";
    const fileFormat = ext === "XLSX" ? "XLSX" : "CSV";

    const { apiClient } = await import("../utils/frappeAPI");

    try {
      const response = await apiClient.get(
        `/api/method/nextai.nextai.doctype.scheduled_data_import.scheduled_data_import.download_file_with_errors`,
        {
          params: {
            scheduled_data_import: item.name,
            file_format: fileFormat,
          },
          responseType: "blob",
          headers: {
            Accept: "application/json, text/plain, */*",
          },
        }
      );

      // Successfully downloaded the blob
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      let fileName = `${item.name}_errors.${fileFormat.toLowerCase()}`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      // If the error response is a Blob, we need to read it as text to parse the JSON error
      if (error.response && error.response.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          error.response.data = JSON.parse(text);
        } catch (e) {
          error.response.data = { message: "An error occurred while downloading the error file." };
        }
      }
      throw error; // Rethrow to let the component handle and format it
    }
  },
};
