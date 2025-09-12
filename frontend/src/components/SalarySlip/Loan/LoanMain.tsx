"use client"

import { useState } from "react"
import { Search as SearchIcon } from "lucide-react"
import { useScreenSize } from "../../../hooks/useScreenSize"
import CreateLoanDialog from "./component/CreateLoanDailog"
import LoanList from "./component/LoanListView"
import { Loan } from "./Type/loan"
import ListViewOfLoanForMobile from "./component/ListViewOfLoanForMobile"


const sampleLoans: Loan[] = [
  {
    id: 3,
    loanType: "Education Loan",
    loanName: "Education Loan",
    emiType: "Flat",
    loanAmount: 100000,
    rateOfInterest: 10,
    standardInterestRate: 10,
    noOfInstallments: 12,
    startDate: "30-09-2025",
    endMonth: "31-08-2026",
    status: "Open",
    pendingMonths: 12,
    totalPrincipal: 100000,
    totalPrincipalWithInterest: 104674,
    paidPrincipal: 0,
    paidPrincipalWithInterest: 0,
    pendingPrincipalAmount: 100000,
    pendingPrincipalWithInterest: 104674,
    installments: [
      {
        id: 1,
        month: "Sep 2025",
        openingBalance: 100000,
        installmentAmount: 8821,
        interest: 28,
        loanEmi: 8349,
        standardInterest: 28,
        principalBalance: 91679,
        perquisites: 0,
        isLocked: false,
      },
      {
        id: 2,
        month: "Oct 2025",
        openingBalance: 91679,
        installmentAmount: 7993,
        interest: 764,
        loanEmi: 8757,
        standardInterest: 764,
        principalBalance: 83686,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 3,
        month: "Nov 2025",
        openingBalance: 83686,
        installmentAmount: 8060,
        interest: 697,
        loanEmi: 8757,
        standardInterest: 697,
        principalBalance: 75626,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 4,
        month: "Dec 2025",
        openingBalance: 75626,
        installmentAmount: 8127,
        interest: 630,
        loanEmi: 8757,
        standardInterest: 630,
        principalBalance: 67499,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 5,
        month: "Jan 2026",
        openingBalance: 67499,
        installmentAmount: 8194,
        interest: 562,
        loanEmi: 8757,
        standardInterest: 562,
        principalBalance: 59305,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 6,
        month: "Feb 2026",
        openingBalance: 59305,
        installmentAmount: 8263,
        interest: 494,
        loanEmi: 8757,
        standardInterest: 494,
        principalBalance: 51042,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 7,
        month: "Mar 2026",
        openingBalance: 51042,
        installmentAmount: 8331,
        interest: 425,
        loanEmi: 8757,
        standardInterest: 425,
        principalBalance: 42711,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 8,
        month: "Apr 2026",
        openingBalance: 42711,
        installmentAmount: 8401,
        interest: 356,
        loanEmi: 8757,
        standardInterest: 356,
        principalBalance: 34310,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 9,
        month: "May 2026",
        openingBalance: 34310,
        installmentAmount: 8471,
        interest: 286,
        loanEmi: 8757,
        standardInterest: 286,
        principalBalance: 25839,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 10,
        month: "Jun 2026",
        openingBalance: 25839,
        installmentAmount: 8542,
        interest: 215,
        loanEmi: 8757,
        standardInterest: 215,
        principalBalance: 17297,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 11,
        month: "Jul 2026",
        openingBalance: 17297,
        installmentAmount: 8613,
        interest: 144,
        loanEmi: 8757,
        standardInterest: 144,
        principalBalance: 8684,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 12,
        month: "Aug 2026",
        openingBalance: 8684,
        installmentAmount: 8684,
        interest: 72,
        loanEmi: 8756,
        standardInterest: 72,
        principalBalance: 0,
        perquisites: 0,
        isLocked: true,
      },
    ],
  },
  {
    id: 4,
    loanType: "Education Loan",
    loanName: "Education Loan",
    emiType: "Flat",
    loanAmount: 100000,
    rateOfInterest: 10,
    standardInterestRate: 10,
    noOfInstallments: 12,
    startDate: "30-09-2025",
    endMonth: "31-08-2026",
    status: "Open",
    pendingMonths: 12,
    totalPrincipal: 100000,
    totalPrincipalWithInterest: 104674,
    paidPrincipal: 0,
    paidPrincipalWithInterest: 0,
    pendingPrincipalAmount: 100000,
    pendingPrincipalWithInterest: 104674,
    installments: [
      {
        id: 1,
        month: "Sep 2025",
        openingBalance: 100000,
        installmentAmount: 8821,
        interest: 28,
        loanEmi: 8349,
        standardInterest: 28,
        principalBalance: 91679,
        perquisites: 0,
        isLocked: false,
      },
      {
        id: 2,
        month: "Oct 2025",
        openingBalance: 91679,
        installmentAmount: 7993,
        interest: 764,
        loanEmi: 8757,
        standardInterest: 764,
        principalBalance: 83686,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 3,
        month: "Nov 2025",
        openingBalance: 83686,
        installmentAmount: 8060,
        interest: 697,
        loanEmi: 8757,
        standardInterest: 697,
        principalBalance: 75626,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 4,
        month: "Dec 2025",
        openingBalance: 75626,
        installmentAmount: 8127,
        interest: 630,
        loanEmi: 8757,
        standardInterest: 630,
        principalBalance: 67499,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 5,
        month: "Jan 2026",
        openingBalance: 67499,
        installmentAmount: 8194,
        interest: 562,
        loanEmi: 8757,
        standardInterest: 562,
        principalBalance: 59305,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 6,
        month: "Feb 2026",
        openingBalance: 59305,
        installmentAmount: 8263,
        interest: 494,
        loanEmi: 8757,
        standardInterest: 494,
        principalBalance: 51042,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 7,
        month: "Mar 2026",
        openingBalance: 51042,
        installmentAmount: 8331,
        interest: 425,
        loanEmi: 8757,
        standardInterest: 425,
        principalBalance: 42711,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 8,
        month: "Apr 2026",
        openingBalance: 42711,
        installmentAmount: 8401,
        interest: 356,
        loanEmi: 8757,
        standardInterest: 356,
        principalBalance: 34310,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 9,
        month: "May 2026",
        openingBalance: 34310,
        installmentAmount: 8471,
        interest: 286,
        loanEmi: 8757,
        standardInterest: 286,
        principalBalance: 25839,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 10,
        month: "Jun 2026",
        openingBalance: 25839,
        installmentAmount: 8542,
        interest: 215,
        loanEmi: 8757,
        standardInterest: 215,
        principalBalance: 17297,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 11,
        month: "Jul 2026",
        openingBalance: 17297,
        installmentAmount: 8613,
        interest: 144,
        loanEmi: 8757,
        standardInterest: 144,
        principalBalance: 8684,
        perquisites: 0,
        isLocked: true,
      },
      {
        id: 12,
        month: "Aug 2026",
        openingBalance: 8684,
        installmentAmount: 8684,
        interest: 72,
        loanEmi: 8756,
        standardInterest: 72,
        principalBalance: 0,
        perquisites: 0,
        isLocked: true,
      },
    ],
  },
]



export default function LoansPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { isDesktop } = useScreenSize()

  const filteredLoans = sampleLoans.filter(
    (loan) =>
      loan.loanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.loanType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.id.toString().includes(searchTerm)
  )

  // Desktop Layout
  const DesktopLayout = () => (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden">
      <div className="w-full max-w-[82vw] mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Loans For FY25-26
          </h1>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Loans
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 w-full px-4">
          <div className="relative max-w-md">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search loans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md 
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Loans List */}
        <div className="px-4">
          <LoanList loans={filteredLoans} />
        </div>

        {filteredLoans.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500">
              No loans found matching your search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  )

  // Mobile Layout
  const MobileLayout = () => (
    <div className="min-h-screen w-full ">
     <ListViewOfLoanForMobile/>
    </div>
  )

  return (
    <div>
    <>
    {isDesktop ? <DesktopLayout /> : <MobileLayout />}
  </>
  <CreateLoanDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
  </div>
  )
}
