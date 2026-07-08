import { useQuery } from "@tanstack/react-query";
import CarouselService from "../services/carouselService";

export const useCarouselCards = () => {
  return useQuery({
    queryKey: ["carouselCards"],
    queryFn: () => CarouselService.getCarouselCards(),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
};
