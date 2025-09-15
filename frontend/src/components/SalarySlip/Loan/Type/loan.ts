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
  }
  