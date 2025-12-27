import FrappeAPI from "../utils/frappeAPI";
import { Loan } from "../components/Compansation/Loan/Type/loan";

export const getLoan = async (employeeId: string): Promise<Loan[]> => {
  if (!employeeId) throw new Error("Employee ID is required");

  const result = await FrappeAPI.callMethod("cn_indian_payroll.cn_indian_payroll.overrides.loan_dashboard.print_loan_dashboard", {
    employee: employeeId,
  });
  return result as Loan[];
};