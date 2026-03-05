/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import FrappeAPI from "../../utils/frappeAPI";

type FetchHTMLArgs = {
  declaration_id: string;
  doctype?: string;
  docname?: string;
  proof_id?: string;
};

export const getNewRegime = async (employee: string | null, company: string | null, payroll_period: string | null) => {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.tds_declaration_form",
      {
        employee: employee,
        company: company,
        payroll_period: payroll_period, 
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
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.update_declaration_form",
      payload 
    );

    return response;
  },
};


const fetchHTML = async (method: string, args: FetchHTMLArgs) => {
  const response = await axios.get(`/api/method/${method}`, {
    params: args, 
  });

  const data = response.data?.message ?? response.data;
  return data?.response ?? data;
};

export const getCompareTaxSheetHTML = async (declarationId: string) => {
  return fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_tds_projection_print_html",
    {
      declaration_id: declarationId, 
    }
  );
};

export const getForm12B = async (declarationId: string, docName: string) => {
  return fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_form12b_pdf",
    {
      docname: declarationId,
      doctype: docName,
      declaration_id: ""
    }
  );
};

export const getPerviewOfITDeclaration = async (declarationId: string,) => {
  return fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_tds_projection_poi_print_html",
    {
      proof_id: declarationId,
      declaration_id: ""
    }
  );
};


export const getProofDateForITDeclaration = async (currentDate: string, employee: string | null, declarationDoctype: string | null, payroll_period: string | null ) => {
  console.log("getProofDateForITDeclaration params", {currentDate, employee, declarationDoctype, payroll_period});
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.declaration_locking_period_visibility",
    {
        employee: employee,
        doctype: declarationDoctype,
        payroll_period: payroll_period, 
        posting_date: currentDate,
    }
  );



  return response;
};


export const getLTABrakup = async (employee: string | null) => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.lta_breakup.get_lta_breakup",
    {
        employee: employee,
    }
  );
  return response;
};