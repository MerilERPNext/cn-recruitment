import { useQuery } from "@tanstack/react-query";
import { getSalaryStructureAssignment } from "../../services/payrollApi/payPackagesService";



export const usePayPackage = (
 employeeId: string, selectedPeriod: string, company: string
) => {
return useQuery({
queryKey: ["payroll-data", employeeId, selectedPeriod],
queryFn: () => getSalaryStructureAssignment(employeeId, selectedPeriod,  company),
enabled: true,
staleTime: 5 * 60 * 1000, // 5 minutes
});
}