export type AppreciationHistoryTab = "received" | "given";

export type AppreciationHistoryItem = {
  id: string;
  title: string;
  value: string;
  person: string;
  personId?: string;   // Employee id of `person`, for the hover card
  personImage?: string;
  employeeId?: string;
  date: string;
  imageUrl?: string;
  tab: AppreciationHistoryTab;
};
