import FrappeAPI from "../utils/frappeAPI";

export interface WebsiteBrandingResponse {
  title_prefix: string;
  app_logo: string;
}

export const BrandingService = {
  getWebsiteBranding: async (): Promise<WebsiteBrandingResponse> => {
    const result = await FrappeAPI.callMethod(
      "cn_hrms_core.api.get_website_branding"
    );
    return result as WebsiteBrandingResponse;
  },
};
