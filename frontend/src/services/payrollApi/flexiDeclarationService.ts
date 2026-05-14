import FrappeAPI from "../../utils/frappeAPI";
import { FlexiComponent, FlexiDataResponse } from "../../types/flexiDeclaration";

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
