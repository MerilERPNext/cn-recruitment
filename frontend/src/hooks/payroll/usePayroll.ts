import { useQuery } from "@tanstack/react-query"
import { getSalaryStructureAssignment } from "../../services/payrollApi/payPackagesService"

export const usePayPackage = (
  employeeId: string,
) => {
    return useQuery({
      queryKey: ["payroll-data", employeeId],
      queryFn: () => getSalaryStructureAssignment(employeeId),
      enabled: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
  
    
