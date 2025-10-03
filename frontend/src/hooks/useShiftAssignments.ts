// hooks/useShiftAssignments.ts
import { useQuery } from "@tanstack/react-query";
import { ApiShiftAssignment } from "../types/shiftAssignmentType";
import { getShiftAssignments } from "../services/shiftAssignmentService";

export const useShiftAssignments = () => {
  return useQuery<ApiShiftAssignment[]>({
    queryKey: ["shift-assignments"],
    queryFn: () => getShiftAssignments(),
  });
};
