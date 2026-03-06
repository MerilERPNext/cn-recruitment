import { useQuery } from "@tanstack/react-query";
import { CompanyLogoService } from "../services/companylogo";
import CompanyLogo from "../types/companyLogo";

export const useCompanyLogo = () => {
  return useQuery<CompanyLogo[]>({
    queryKey: ["company-logo"],
    queryFn: CompanyLogoService.getCompanyLogo, // ✅ fixed typo
  });
};

export const useSingleCompanyLogo = (companyName: string) => {
  return useQuery<CompanyLogo>({
    queryKey: ["company-logo", companyName],
    queryFn: () =>
      CompanyLogoService.getSingleCompanyLogo(companyName),
    enabled: !!companyName,
  });
};