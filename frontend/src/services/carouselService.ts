import FrappeAPI from "../utils/frappeAPI";

export interface CarouselCard {
  card_type: string;
  slogan: string;
  card_label: string;
  description: string;
  icon: string | null;
  sort_order: number;
  show_on_mobile_app?: number;
  redirect_route: string;
  redirect_url: string;
  is_self: boolean;
  target_user: string | null;
}

class CarouselService {
  static async getCarouselCards(): Promise<CarouselCard[]> {
    try {
      const result = await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.carousel.get_carousel_cards",
        {},
      );
      return (result as CarouselCard[]) || [];
    } catch (error) {
      console.error("Error fetching carousel cards", error);
      return [];
    }
  }
}

export default CarouselService;
