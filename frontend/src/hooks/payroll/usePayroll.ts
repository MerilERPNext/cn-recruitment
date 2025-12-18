import { useQuery } from "@tanstack/react-query"
import { getSalaryStructureAssignment } from "../../services/payrollApi/payPackagesService"

export const usePayPackage = () => {
    return useQuery({
      queryKey: ["payroll-data"],
      queryFn: () => getSalaryStructureAssignment(),
      enabled: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
  
    
