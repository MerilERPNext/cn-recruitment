export type ExpenseCategoryType = "General" | "Relocation";

export interface ExpensePolicyQuestion {
  question_name: string;
  status: string;
  description: string;
}

export interface ExpensePolicyCategory {
  category_name: string;
  category_display_name: string;
  questions: ExpensePolicyQuestion[];
}

export interface ExpensePolicyQuestionsResponse {
  success: boolean;
  data: ExpensePolicyCategory[];
  options: string[];
}
