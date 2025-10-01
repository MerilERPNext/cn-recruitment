// services/shiftAssignments.ts
import FrappeAPI from "../utils/frappeAPI";
import { ApiShiftAssignment } from "../types/shiftAssignmentType";

export const getShiftAssignments = async (
): Promise<ApiShiftAssignment[]> => {

  const result = await FrappeAPI.callMethod(
    "cn_leave_shift_managment.api.get_shift_assignments_for_user"
  );

  return result as ApiShiftAssignment[];
};
