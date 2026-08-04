/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FlexiComponent {
  salary_component: string;
  type: string;
  visibility_type: "Editable" | "Non Editable" | "Read Only" | string;
  max_amount: string | number;
  variable_name?: string;
  check_box_variable_name?: string | null;
  amount: number;
  component_type?: string;
  custom_old_regime_max_percentage?: number;
  custom_new_regime_max_percentage?: number;
  custom_nps_type?: "Amount" | "Percentage";
}

export interface ComponentPartOfCTC {
  component: string;
  amount: number;
  annual_amount: number;
  type: string;
}

/** A summary row (e.g. Fixed Gross, Fixed CTC) with monthly + annual totals. */
export interface SummaryCTCRow {
  component: string;
  monthly_amount: number;
  annual_amount: number;
}

/** Variable pay row – may have a null component name. */
export interface VariablePayRow {
  component: string | null;
  annual_amount: number;
}

/** Total CTC row. */
export interface TotalCTCRow {
  component: string;
  annual_amount: number;
}

export interface SalaryData {
  assignment_name: string;
  employee: string;
  docstatus: number;
  active: number;
  from_date: string;
  salary_structure: string;
  custom_tax_regime?: string;
  income_tax_slab?: string;

  /** Earning components (Basic, HRA, etc.) */
  earning_part_of_ctc: ComponentPartOfCTC[];
  /** Fixed Gross summary row */
  fixed_gross: SummaryCTCRow[];
  /** Deduction components (EPF, etc.) */
  deduction_part_of_ctc: ComponentPartOfCTC[];
  /** Reimbursement components that are part of CTC */
  reimbursements_part_of_ctc: ComponentPartOfCTC[];
  /** Fixed CTC summary row */
  fixed_ctc: SummaryCTCRow[];
  /** Variable pay included in CTC */
  variable_pay_include_ctc: VariablePayRow[];
  /** Variable pay excluded from CTC */
  variable_pay_exclude_ctc: VariablePayRow[];
  /** Total final CTC summary row */
  total_final_ctc: TotalCTCRow[];

  version: any[];

  // ── Legacy / backward-compatible fields (optional) ──
  component_part_of_ctc?: ComponentPartOfCTC[];
  monthly_ctc?: number;
  annual_ctc?: number;
  gross_pay?: number;
  net_pay?: number;
  total_deduction?: number;
  fixed_gross_annual?: number;
  fixed_gross_monthly?: number;
  monthly_reimbursement?: number;
  annual_reimbursement?: number;
  total_ctc?: number;
}

export interface FlexiDataResponse {
  flexi_components: FlexiComponent[];
  salary_data: SalaryData;
}

export interface YearOption {
  name: string;
}

export interface FlexiLockingPeriodVisibility {
  // The backend returns { message: { ... } }; callMethod unwraps one level, so
  // the consumable shape is the nested object below.
  message: {
    status: "success" | "failed";
    /** Human-readable window text incl. the dates to submit FlexiBenefit by. */
    message: string;
    flexibenefit_enabled?: number;
    declaration_enabled?: number;
    income_tax_enabled?: number;
  };
}

export interface FlexiLockingPeriod extends Record<string, unknown> {
  individual_start_date: any;
  individual_end_date: any;
  employee: string;
  start_date: string;
  end_date: string;
  status: "Open" | "Closed";
  doctype_name: string;
}
