import FrappeAPI from "../../utils/frappeAPI";
import { FlexiComponent, FlexiDataResponse, FlexiLockingPeriod, FlexiLockingPeriodVisibility } from "../../types/flexiDeclaration";

export const fetchFlexiComponents = async (employee: string, payroll_period: string, company: string): Promise<FlexiDataResponse> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_structure_assignment.fetch_flexi_components",
    {
      employee,
      payroll_period,
      company,
    }
  );
  return response as FlexiDataResponse;
};

export const updateFlexiComponents = async (data: { id: string, flexi_components: FlexiComponent[] }): Promise<any> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_structure_assignment.update_flexi_components",
    {
      data
    }
  );
  return response;
};

export const fetchFlexiLockingPeriodVisibility = async (params: {
  employee: string;
  payroll_period: string;
  posting_date: string;
  doctype: string;
}): Promise<FlexiLockingPeriodVisibility> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.flexibenefit_locking_period_visibility",
    params
  );
  return response as FlexiLockingPeriodVisibility;
};

export const fetchIndividualEmployeeFlexiLockingPeriod = async (employee: string): Promise<FlexiLockingPeriod> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.release_config.get_individual_employee_flexi_locking_period",
    { employee }
  );
  return response as FlexiLockingPeriod;
};

export const setIndividualEmployeeFlexiLockingPeriod = async (data: FlexiLockingPeriod): Promise<any> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.release_config.set_individual_employee_flexi_locking_period",
    data
  );
  return response;
};

