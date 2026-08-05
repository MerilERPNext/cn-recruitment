import { useFrappeDocumentList } from "./useFrappeQuery";

export const useCompanyMap = () => {
  const { data: companies, isLoading, error } = useFrappeDocumentList("Company", {
    fields: ["name", "company_name"],
    limit: 1000,
  });

  const companyMap = ((companies as Record<string, string>[]) || []).reduce((acc: Record<string, string>, company: Record<string, string>) => {
    acc[company.name] = company.company_name || company.name;
    return acc;
  }, {} as Record<string, string>);

  return {
    companyMap,
    isLoading,
    error,
  };
};
