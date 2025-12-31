/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import FrappeAPI from "../../utils/frappeAPI";

type FetchHTMLArgs = {
  declaration_id: string;
};

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

export const getITDecalarationData = async (goHeadValue: boolean, employee: string | null, company: string | null, payroll_period: string | null ) => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.tds_declaration_form",
    {
        employee: employee,
        company: company,
        payroll_period: payroll_period, 
        go_head_with_new_regime: goHeadValue,
    }
  );

  console.log("FULL API RESPONSE 👉", response);

  return response;
};

export const upDateITDeclarationSheet = {
  submitITDeclaration: async (payload: any) => {
    // POST payload directly to API method
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.update_declaration_form",
      payload // send entire payload
    );

    return response;
  },
};


const fetchHTML = async (method: string, args: FetchHTMLArgs) => {
  const response = await axios.get(`/api/method/${method}`, {
    params: args, // ✅ exact key goes to frappe
  });

  const data = response.data?.message ?? response.data;
  return data?.response ?? data;
};

export const getCompareTaxSheetHTML = async (declarationId: string) => {
  return fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_tds_projection_print_html",
    {
      declaration_id: declarationId, // ✅ REQUIRED BY BACKEND
    }
  );
};
