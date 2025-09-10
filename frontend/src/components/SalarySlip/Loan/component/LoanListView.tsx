"use client"
import { useState } from "react"
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io"
import { BsDashSquareFill } from "react-icons/bs"
import { Loan } from "../Type/loan"
import LoanDetails from "./LoanDetails"
import LoanInstallments from "./LoanInstallment"

interface LoanListProps {
  loans: Loan[]
}

export default function LoanList({ loans }: LoanListProps) {
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null)

  const toggleLoanExpansion = (loanId: number) => {
    setExpandedLoan(expandedLoan === loanId ? null : loanId)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="w-full">
      {/* Single container with proper scroll handling */}
      <div className="w-full max-h-full overflow-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="w-full divide-y divide-gray-200 ">
          <thead className="bg-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left" >
                <span className="px-2 rounded text-blue-500">
                  <BsDashSquareFill />
                </span>
              </th>
              <th className="px-4 py-3 text-left" >
                ID
              </th>
              <th className="px-4 py-3 text-left" >
                Loan Type
              </th>
              <th className="px-4 py-3 text-left" >
                Loan Name
              </th>
              <th className="px-4 py-3 text-left" >
                EMI Type
              </th>
              <th className="px-4 py-3 text-left" >
                Loan Amount
              </th>
              <th className="px-4 py-3 text-left" >
                Rate of Interest
              </th>
              <th className="px-4 py-3 text-left" >
                Standard Interest
              </th>
              <th className="px-4 py-3 text-left" >
                Installments
              </th>
              <th className="px-4 py-3 text-left" >
                Start Date
              </th>
              <th className="px-4 py-3 text-left" >
                End Month
              </th>
              <th className="px-4 py-3 text-left" >
                Status
              </th>
              <th className="px-4 py-3 text-left" >
                Action
              </th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-200 bg-white">
            {loans.map((loan) => (
              <>
                {/* Main Row */}
                <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleLoanExpansion(loan.id)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-gray-600 font-mono"
                    >
                      {expandedLoan === loan.id ? <IoIosArrowUp /> : <IoIosArrowDown />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{loan.id}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.loanType}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.loanName}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.emiType}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(loan.loanAmount)}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.rateOfInterest}%</td>
                  <td className="px-4 py-3 text-gray-700">{loan.standardInterestRate}%</td>
                  <td className="px-4 py-3 text-gray-700">{loan.noOfInstallments}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.startDate}</td>
                  <td className="px-4 py-3 text-gray-700">{loan.endMonth}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-medium ${
                        loan.status === "Open"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-gray-100 text-gray-800 border border-gray-200"
                      }`}
                    >
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 bg-transparent transition-colors font-medium">
                      Complete
                    </button>
                  </td>
                </tr>

                {/* Expanded Row */}
                {expandedLoan === loan.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={13} className="px-6 py-4 border-t border-gray-200">
                      <div className="space-y-4">
                        <LoanDetails loan={loan} />
                        <LoanInstallments installments={loan.installments} />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {loans.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">No loans available.</p>
        </div>
      )}
    </div>
  )
}
