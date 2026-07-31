export type AppreciationHistoryTab = "received" | "given";

export type AppreciationHistoryItem = {
  id: string;
  title: string;
  value: string;
  person: string;
  personImage?: string;
  employeeId?: string;
  date: string;
  imageUrl?: string;
  tab: AppreciationHistoryTab;
};
