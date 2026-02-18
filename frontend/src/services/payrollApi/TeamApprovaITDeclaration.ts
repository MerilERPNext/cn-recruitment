import FrappeAPI from "../../utils/frappeAPI";

export const getTeamApprovalList = async (
  ProofID?: string,
) => {
  const response = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_approved_poi_category", {
    proof_id: ProofID,
  })  

  return response;  
};

// export const getITDecalarationData = {
//   getDraftITDeclarationRequests: async () => {
//     const response = await FrappeAPI.getDocumentList("Employee Tax Exemption Proof Submission", {
//       fields: ["*"],
//       filters: [["docstatus", "=", 0]],
//       orderBy: "creation desc",
//     });

//     return response.data;
//   },
// }

export const ApprovalITDeclarationService = {
    submit: async (payload: {
      empdoc_id: string;
      exemption_sub_category: string;
      status: string;
      approved_amount: number;
    }) => {
      const response = await FrappeAPI.callMethod(
        "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.approved_poi_components",
        {
          proof_id: payload.empdoc_id,
          sub_category: payload.exemption_sub_category,
          amount: payload.approved_amount, // Assuming max limit for 80C is 1.5L and others are 0
          status: payload.status,
        }
      );
  
      return response;
    },
  };
  
