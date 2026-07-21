// types/BenefitClaim.ts

export interface BenefitClaim {
    BenefitClaim: string    
    name: string
    owner: string
    creation: string
    modified: string
    modified_by: string
    docstatus: number
    idx: number
    employee: string
    employee_name: string
    department: string | null
    custom_payroll_period: string
    claim_date: string
    currency: string
    company: string
    amended_from: string | null
    custom_status: string
    earning_component: string
    max_amount_eligible: number
    custom_max_amount: number
    pay_against_benefit_claim: number
    claimed_amount: number
    salary_slip: string | null
    custom_is_paid: number
    custom_paid_amount: number
    attachments: string | null
    custom_approved_by: string | null
    custom_approver_name: string | null
    custom_emp_code: string | null
    custom_note_by_employee: string | null
  }
  
  export interface BenefitClaimResponse {
    data: BenefitClaim[]
  }
  