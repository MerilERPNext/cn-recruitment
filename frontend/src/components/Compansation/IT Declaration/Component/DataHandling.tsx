// utils/normalizeITDeclaration.ts

import { ITCategory } from "../../../../types/itDeclaration";



export const normalizeITCategories = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiResponse: any
): ITCategory[] => {
  if (!apiResponse) return [];

  // ✅ New Regime (1)
  if (apiResponse.go_head_with_new_regime === 1) {
    return apiResponse.categories ?? [];
  }

  // ✅ Old Regime (0)
  if (apiResponse.go_head_with_new_regime === 0) {
    return apiResponse.categories ?? [];
  }

  return [];
};
