export type Item = {
    name: string;
    max_amount: number;
    custom_description: string | null;
  };
  
  export type ITCategory = {
    category_name: string;
    items: Item[];
  };
  