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
    loan_requested_amount: number
    loan_amount: number
    loan_name: string
    loan_type:  string
    emi_type: string
    rate_of_interest: number
    standard_interest: number
    loan_tenure: number
    loan_start_date: string
    loan_approved_amount: number
    status: string
    repayment_schedule: Installment[]
    monthly_repayment_amount: number
    total_months: number
    paid_months: number
    total_loan_amount: number
    total_paid_amount: number
    remaining_amount: number
    remaining_months: number
    remainingAmount: number
    totalPaidAmount: number
    totalLoanAmount: number
    remainingMonths: number
    totalMonths: number
    totalPayment: number
    loanAmount: number
    paidMonths: number
    applicantName: string
    standardInterest: number
    loanName: string
    name: string
    employee: string
  }
  