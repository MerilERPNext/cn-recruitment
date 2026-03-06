import FrappeAPI from "../../utils/frappeAPI";

export type EditITDeclarationValue = {
  employee: string;
  company: string;
  payroll_period: string;
  frequency_type: string;
  release_config: string;
  individual_start_date: string;
  individual_end_date: string;
  active: number;
  status: "Open" | "Closed";
  type: string;
};

export const EditITDeclarationService = {
  submit: async (payload: {
    empdoc_id: string | null;
    declaration_type: string;
    status: string;
    from_date: string;
    to_date: string;
  }) => {
    const response = await FrappeAPI.callMethod(
      "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.release_config.set_individual_employee_locking_period",
      {
        employee: payload.empdoc_id,
        doctype_name: payload.declaration_type,
        start_date: payload.from_date,
        end_date: payload.to_date,
        status: payload.status,
      }
    );

    return response;
  },
};

export const getEditValueITDeclaration = async (
  empdoc_id: string | null
): Promise<EditITDeclarationValue> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.release_config.get_individual_employee_locking_period",
    {
      employee: empdoc_id,
    }
  );

  return response as EditITDeclarationValue;
};