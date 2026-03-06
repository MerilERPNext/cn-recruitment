import { ReactNode } from "react";

export interface SeriesItem {
    name: string;
    values: number[]; // monthly values (length should match months.length)
    total: number;
}
  
  export interface TaxSheetData {
    current_tax_regime: ReactNode;
    status: string;
    months: string[]; // e.g. ["April-2025", ...]
    earnings: SeriesItem[]; // Example items: "Basic", "House Rent Allowance", "Gross Earnings"
    deductions: SeriesItem[]; // Example items: "Provident Fund", "Total Deductions"
    net_pay: SeriesItem[]; // usually single item "Net Pay"
    reimbursements: SeriesItem[]; // "Total Reimbursements"
    offcycle_earnings: SeriesItem[]; // "Total Offcycle"
  }
  
  /**
   * Type returned by your hook useTaxSheetData.
   * Adjust fields if your hook returns more (isLoading, error, etc.)
   */
  export type UseTaxSheetDataReturn = {
    data?: TaxSheetData | null;
    isLoading?: boolean;
    error?: unknown;
  };
  