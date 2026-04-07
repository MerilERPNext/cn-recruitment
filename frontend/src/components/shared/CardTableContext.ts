import { createContext, useContext } from "react";

export type SortDirection = "asc" | "desc" | null;

export type ColumnSortConfig =
  | {
      sortable: true;
      type?: "string" | "date" | "number";
      field: string;
      /**
       * The field name to send as `order_by` to the server.
       * Defaults to `field` when omitted.
       * Use this when the logical column name differs from the DB field
       * (e.g. a computed "duration" column can map to "from_date").
       */
      orderByField?: string;
      /** Custom value accessor — only used when `clientSortFn` is provided externally. */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getValue?: (item: any) => string | number;
    }
  | { sortable: false }
  | null;

export interface CardTableSortContextValue {
  sortState: { field: string; direction: SortDirection } | null;
  columnSortConfig: ColumnSortConfig[];
}

export const CardTableSortContext =
  createContext<CardTableSortContextValue | null>(null);

export const useCardTableSort = () => useContext(CardTableSortContext);
