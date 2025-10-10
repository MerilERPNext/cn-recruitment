import FrappeAPI from "../utils/frappeAPI";

export type PayrollData = {
  component_array: string[];
  payroll_period: string;
};

export const getClaimBenefitFor = async (
  empId: string | null | undefined,
  date: string | null
): Promise<PayrollData> => {
  try {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.benefit_claim.benefit_claim",
      {
        employee: empId,
        claim_date: date,
      }
    );
    return response as PayrollData;
  } catch (error) {
    console.error("📡 Error while getting claim benifit for", error);
    throw error;
  }
};
export const getClaimBenifitMaxAmount = async (
  empId: string | null | undefined,
  earning_component: string | null
): Promise<number> => {
  try {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.benefit_claim.get_max_amount",
      {
        employee: empId,
        earning_component,
      }
    );
    return response as number;
  } catch (error) {
    console.error(
      "📡 Error while getting claim benifit for max amount:",
      error
    );
    throw error;
  }
};

export const createBenifitRequest = async (
  body: Record<string, unknown>
): Promise<boolean> => {
  try {
    const response = await FrappeAPI.createDocument(
      "Employee Benefit Claim",
      body
    );

    // Return true if response is not null/undefined
    return !!response;
  } catch (error) {
    console.error(
      "📡 Error while Adding Employee Benefit Claim Application in:",
      error
    );
    throw error;
  }
};
