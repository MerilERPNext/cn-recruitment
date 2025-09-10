import { useState } from "react"
import { Search as SearchIcon } from "lucide-react"
import LoanList from "./LoanListView"
import { Loan } from "../Type/loan"

interface DesktopPageProps {
  loans: Loan[]
}

const DesktopPage: React.FC<DesktopPageProps> = ({ loans }) => {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredLoans = loans.filter(
    (loan) =>
      loan.loanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.loanType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.id.toString().includes(searchTerm)
  )

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="w-full max-w-[84rem] mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Loans For FY25-26
          </h1>
          <button
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
}

export default DesktopPage
