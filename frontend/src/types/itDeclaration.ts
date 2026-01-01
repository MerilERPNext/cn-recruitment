// types/itDeclaration.ts

export type ITItem = {
  name: string;
  exemption_sub_category: string;
  description: string | null;
  editable: number;
  amount: number;
  max_amount: number;
};

export type ITCategory = {
  category_name: string;
  items: ITItem[];
};
