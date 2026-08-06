import type { SkillsOverviewResponse } from "../types/skills";
import FrappeAPI from "../utils/frappeAPI";

export const skillsService = {
  /**
   * Fetches the full skills-tab overview for the current
   * (or target-header) employee.
   *
   * API: cn_pms.cn_performance_management.api.skills_api.get_skills_overview
   */
  getSkillsOverview: async (): Promise<SkillsOverviewResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.skills_api.get_skills_overview",
    );

    return response as SkillsOverviewResponse;
  },
};
