import FrappeAPI from "../utils/frappeAPI";
import { PayrollData } from "./benifitService";

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
