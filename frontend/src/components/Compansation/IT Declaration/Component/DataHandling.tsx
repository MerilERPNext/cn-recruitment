/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ITCategory } from "../../../../types/itDeclaration";

export type GroupedCategory = {
  section: string; // custom_section_property (80C)
  categories: ITCategory[];
};

export const normalizeITCategories = (apiResponse: any): GroupedCategory[] => {
  if (!apiResponse?.categories) return [];

  return apiResponse.categories.map((section: any) => ({
    section: section.custom_section_property,
    categories: Array.isArray(section.exemption_category)
      ? section.exemption_category.map((cat: any) => ({
          exemption_category: section.custom_section_property,
          category_name: cat.category_name,
          max_amount: cat.max_amount,
          custom_select_type: cat.custom_select_type,
          custom_80d_variable: cat.custom_80d_variable, 
          items: Array.isArray(cat.items) ? cat.items : [],
          custom_section_property: section.custom_section_property,
        }))
      : [],
  }));
};
