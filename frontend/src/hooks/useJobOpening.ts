import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobOpeningService, type CreateJobOpeningFromRequisitionParams } from "../services/jobOpeningService";

// Hook to create job opening from requisition
export function useCreateJobOpeningFromRequisition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: CreateJobOpeningFromRequisitionParams) => 
      jobOpeningService.createJobOpeningFromRequisition(params),
    onSuccess: (_data, variables) => {
      // Invalidate requisition details to refresh the UI
      queryClient.invalidateQueries({ 
        queryKey: ["requisition-details", variables.job_requisition] 
      });
      
      // Invalidate job openings list for this requisition
      queryClient.invalidateQueries({ 
        queryKey: ["job-openings", "by-requisition", variables.job_requisition] 
      });
      
      console.log("✅ Job opening creation successful, queries invalidated");
    },
    onError: (error) => {
      console.error("❌ Job opening creation failed:", error);
    }
  });
}

// Hook to get job openings for a requisition
export function useJobOpeningsByRequisition(job_requisition: string, enabled = true) {
  return useQuery({
    queryKey: ["job-openings", "by-requisition", job_requisition],
    queryFn: () => jobOpeningService.getJobOpeningsByRequisition(job_requisition),
    enabled: enabled && !!job_requisition,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
