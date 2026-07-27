import axios from "axios";
import FrappeAPI from "../../utils/frappeAPI";

type FetchHTMLArgs = {
  salary_slip: string;
};

export const getPerquisite = async (
  employeeId?: string,
  company?: string,
  payroll_period?: string,
) => {
  const response = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.perquisite_payment.get_perquisite_payment_list", {
    employee: employeeId,
    company: company,
    payroll_period: payroll_period,
  })  

  return response;  
};


// Month-wise Perquisite Calendar + summary for one employee & payroll period.
// callMethod unwraps `.message`, so this resolves to
// { payroll_period, start_date, end_date, summary[], calendar[] }.
export const getEmployeePerquisites = async (
  employeeId?: string,
  payroll_period?: string,
) => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.perquisite_payment.get_employee_perquisites",
    {
      employee: employeeId,
      payroll_period: payroll_period,
    },
  );

  return response;
};


export const getInvoiceSalarySlip = async (
  employeeId?: string,
  company?: string,
) => {
  const response = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_slip_list.get_salary_slip_list", {
    employee: employeeId,
    company: company,
  })  

  return response;  
};

const fetchHTML = async (method: string, args: FetchHTMLArgs) => {
  const response = await axios.get(`/api/method/${method}`, {
    params: args, 
  });

  return response.data;
};

export const getInvoiceHTMLSheet = async (invoiceID: string) => {
  return fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.leegality.view_signed_payslip",
    {
      salary_slip: invoiceID, 
    }
  );
};