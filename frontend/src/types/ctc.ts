export interface SalaryComponent {
    component: string;
    amount: number;
    annual_amount: number;
    type: 'Earning' | 'Deduction' | 'Reimbursement';
  }
  
  export interface SalarySlip {
    component_part_of_ctc: SalaryComponent[];
    total_reimbursement_amount: number;
    monthly_ctc: number;
    annual_ctc: number;
    net_pay: number;
    gross_pay: number;
    total_deduction: number;
    fixed_gross: number;
    gratuity?: number;
    medical_insurance?: number;
    bonus?: number;
  }