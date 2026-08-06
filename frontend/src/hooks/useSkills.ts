import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { SkillsOverviewResponse } from "../types/skills";
import { skillsService } from "../services/skillsService";

// ── Query keys ──────────────────────────────────────────────────
interface SkillsQueryKey {
  overview: readonly ["skills", "overview"];
}

export const SKILLS_QUERY_KEYS: SkillsQueryKey = {
  overview: ["skills", "overview"] as const,
};

// ── Hooks ───────────────────────────────────────────────────────

/**
 * Fetches the skills-tab overview data (metric cards, chips,
 * radar chart, focus areas).
 *
 * Stale time is set to 5 min so rapid tab-switches don't
 * re-fetch unnecessarily.
 */
export const useSkillsOverview = (
  options?: { enabled?: boolean },
): UseQueryResult<SkillsOverviewResponse, Error> =>
  useQuery<SkillsOverviewResponse, Error>({
    queryKey: SKILLS_QUERY_KEYS.overview,
    queryFn: skillsService.getSkillsOverview,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
