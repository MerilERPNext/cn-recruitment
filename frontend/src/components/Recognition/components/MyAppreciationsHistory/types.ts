export type AppreciationHistoryTab = "received" | "given";

export type AppreciationHistoryItem = {
  id: string;
  title: string;
  value: string;
  person: string;
  personImage?: string;
  /** Employee id of `person`, for the hover card. */
  personId?: string;
  date: string;
  imageUrl?: string;
  tab: AppreciationHistoryTab;
  points: number;
};
