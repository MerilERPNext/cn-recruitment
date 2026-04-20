import { useQuery } from "@tanstack/react-query";
import { BrandingService } from "../services/brandingService";

export const useWebsiteBranding = () => {
  return useQuery({
    queryKey: ["websiteBranding"],
    queryFn: () => BrandingService.getWebsiteBranding(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours, as branding rarely changes
  });
};
