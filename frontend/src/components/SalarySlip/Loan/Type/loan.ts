export interface Installment {
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
  