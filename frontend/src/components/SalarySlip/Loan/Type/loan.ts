export interface Installment {
    principal: string
    opening_balance: number
    payment_date: string
    balance_loan_amount: number
    principal_amount: number
    total_payment: number
    interest_amount: number
    id: number
    month: string
    openingBalance: number
    installmentAmount: number
    interest: number
    loanEmi: number
    standardInterest: number
    principalBalance: number
    perquisites: number
    isLocked: boolean
  }
  
  export interface Loan {
    total_payment: number
    loan_amount: number
    applicant_name: string
    standard_interest: number
    loan_name: string
    loan_type: string
    emi_type: string
  loan_approved_amount: number
    rate_of_interest: number
    monthly_repayment_amount: number
    loan_tenure: number
    loan_start_date: string
    repayment_schedule: Installment[]
    id: number
    loanType: string
    loanName: string
    emiType: string
    loanAmount: number
    rateOfInterest: number
    standardInterestRate: number
    noOfInstallments: number
    startDate: string
    endMonth: string
    status: "Open" | "Closed" | "Pending"
    pendingMonths: number
    totalPrincipal: number
    totalPrincipalWithInterest: number
    paidPrincipal: number
    paidPrincipalWithInterest: number
    pendingPrincipalAmount: number
    pendingPrincipalWithInterest: number
    installments: Installment[]
  }
  