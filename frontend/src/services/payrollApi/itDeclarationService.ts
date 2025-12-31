import FrappeAPI from "../../utils/frappeAPI";


export const getNewRegime = async (employee: string | null, company: string | null) => {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.tds_declaration_form",
      {
        employee: employee,
        company: company,
        payroll_period: "25-26", 
      }
    );
  
    console.log("FULL API ", response);
  
    return response;
  };

export const getITDecalarationData = async (goHeadValue: boolean, employee: string | null, company: string | null) => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.tds_declaration_form",
    {
        employee: employee,
        company: company,
        payroll_period: "25-26", 
        go_head_with_new_regime: goHeadValue,
    }
  );

  console.log("FULL API RESPONSE 👉", response);

  return response;
};