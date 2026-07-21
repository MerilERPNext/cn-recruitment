import { useMutation, useQuery } from "@tanstack/react-query";
import { ApprovalITDeclarationService,  getTeamApprovalList } from "../../services/payrollApi/TeamApprovaITDeclaration";

export const useTeamApprovalList = (
    ProofID?: string,
  ) => {
  return useQuery({
  queryKey: ["proof-id", ProofID],
  queryFn: () => getTeamApprovalList(ProofID),
  enabled: true,
  staleTime: 5 * 60 * 1000, // 5 minutes
  });
  }

//   export const useITDeclarationListViewData = () => {
//     return useQuery({
//       queryKey: ["Employee Tax Exemption Proof Submission", "draft"],
//       queryFn: getITDecalarationData.getDraftITDeclarationRequests,
//     });
//   };


// hooks/payroll/TeamApprovalITDeclaration.ts

export const useApprovalITDeclaration = () => {
    return useMutation({
      mutationFn: (payload: {
        empdoc_id: string;
        exemption_sub_category: string;
        approved_amount: number;
        status: "Approved" | "Rejected";
        notes?: string;
      }) => ApprovalITDeclarationService.submit(payload),
    });
  };
  