import axios from "axios";
import FrappeAPI from "../utils/frappeAPI";
import { PayrollData } from "./benifitService";

type FetchHTMLArgs = {
  employee: string;
  payroll_period: string;
  company: string;
};


export const getTaxSheetData = async (
empId: string | null | undefined, company: string | null | undefined, selectedPeriod: string | null) => {
  try {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_annual_statement",
      {
        employee: empId,
        company: company,
        payroll_period: selectedPeriod,
      }
    );
    return response as PayrollData;
  } catch (error) {
    console.error("📡 Error while getting claim benifit for", error);
    throw error;
  }
};

export const getIncomeTaxComputationData = async (
empId: string | null | undefined, selectedPeriod: string | null | undefined, company: string | null) => {
  try {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.get_employee_declaration_investments",
      {
        employee: empId,
        company: company,
        payroll_period: selectedPeriod,
      }
    );
    return response as PayrollData;
  } catch (error) {
    console.error("📡 Error while getting claim benifit for", error);
    throw error;
  }
};
const fetchHTML = async (method: string, args: FetchHTMLArgs) => {
  const response = await axios.get(`/api/method/${method}`, {
    params: args, // ✅ exact key goes to frappe
  });

  const data = response.data?.message ?? response.data;
  return data?.response ?? data;
};

export const getTaxSheetHTML = async (employee: string, payroll_period: string, company: string) => {
  return fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.tds_projection.print_declaration_preview",
    {
      employee: employee,
      payroll_period: payroll_period,
      company: company,
    }
  );
};


  



export const PayrollPeriodsService = {
  getPayrollPeriods: async (company: string | null) => {
    const response = await FrappeAPI.getDocumentList("Payroll Period", {
      fields: ["name"],
      orderBy: "creation desc",
      filters: [["company", "=", company]],
    });

    return response.data;
  },
};
