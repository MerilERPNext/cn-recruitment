"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { BsToggleOff, BsToggleOn } from "react-icons/bs"
import { Download } from "lucide-react"
import { useNavigate } from "react-router-dom"
import FrappeListView from "../ListView"
import { useDownloadSalarySlipPDF } from "../../hooks/useSalaryDetails"
import type { UseMutationResult } from "@tanstack/react-query"
import { FaRegEye } from "react-icons/fa"
import SalarySlipPDFModal from "./SalarySlipPDFModal"
import { useScreenSize } from "../../hooks/useScreenSize"

interface SalarySlip {
  name: string
  employee: string
  start_date: string
  end_date: string
  gross_pay: number
  net_pay: number
  status: string
  posting_date: string
}

const SalarySlipsList = () => {
  const navigate = useNavigate()
  const { isDesktop } = useScreenSize()
  const [selectedYear, setSelectedYear] = useState("")
  const [filtersKey, setFiltersKey] = useState(0)
  const [maskSalary, setMaskSalary] = useState(true)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [selectedSalarySlip, setSelectedSalarySlip] = useState<{
    name: string
    date: string
  } | null>(null)

  const { mutate: downloadPDF, isPending: isDownloading }: UseMutationResult<void, Error, string> =
    useDownloadSalarySlipPDF()

  useEffect(() => {
    setFiltersKey((prev) => prev + 1)
  }, [selectedYear])

  const handleGoToSalarySlip = (salaryId: string, startDate?: string) => {
    if (isDesktop) {
      setSelectedSalarySlip({
        name: salaryId,
        date: startDate ? formatToIndianDateModal(startDate) : "",
      })
      setPdfModalOpen(true)
    } else {
      const encodedId = encodeURIComponent(salaryId)
      navigate(`/webapp/salary-slip-app/salary-slip-list/${encodedId}`)
    }
  }

  const formatToIndianDateModal = (dateString: string): string => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const handleDownload = (e: React.MouseEvent, salarySlipName: string) => {
    e.stopPropagation()
    downloadPDF(salarySlipName)
  }

  const filters: Record<string, [string, string]> | undefined = selectedYear
    ? {
        start_date: [">=", `${selectedYear}-01-01`],
        end_date: ["<=", `${selectedYear}-12-31`],
      }
    : undefined

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())

  return (
    <div>
      {/* PDF Modal */}
      {selectedSalarySlip && (
        <SalarySlipPDFModal
          isOpen={pdfModalOpen}
          onClose={() => {
            setPdfModalOpen(false)
            setSelectedSalarySlip(null)
          }}
          salarySlipName={selectedSalarySlip.name}
          salarySlipDate={selectedSalarySlip.date}
        />
      )}
      <FrappeListView
        key={filtersKey}
        doctype="Salary Slip"
        ItemComponent={(props) =>
          isDesktop ? (
            <SalarySlipItemDesktop
              {...(props as {
                item: SalarySlip
                index?: number
                doctype: string
              })}
              maskSalary={maskSalary}
              onDownload={handleDownload}
              onViewPDF={handleGoToSalarySlip}
              isDownloading={isDownloading}
            />
          ) : (
            <SalarySlipItem
              {...(props as {
                item: SalarySlip
                index?: number
                doctype: string
              })}
              maskSalary={maskSalary}
              onDownload={handleDownload}
              onViewPDF={handleGoToSalarySlip}
              isDownloading={isDownloading}
            />
          )
        }
        isSearch={true}
        pageSize={10}
        defaultFields={["name", "employee", "start_date", "end_date", "gross_pay", "net_pay", "status", "posting_date"]}
        searchFields={["employee", "status", "posting_date"]}
        infiniteScroll={true}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultFilters={filters as any}
        PreListComponent={() => (
          <>
            {/* Filters + Mask toggle */}
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-xs">
                <select
                  id="yearFilter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setMaskSalary((prev) => !prev)}
                className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 transition-colors duration-200"
                title={maskSalary ? "Show amounts" : "Hide amounts"}
              >
                {maskSalary ? (
                  <>
                    <span className="text-sm font-medium text-gray-700">Show Amounts</span>
                    <BsToggleOff className="w-6 h-6 text-gray-400" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-700">Hide Amounts</span>
                    <BsToggleOn className="w-6 h-6 text-blue-500" />
                  </>
                )}
              </button>
            </div>

            {/* Desktop table header */}
            {isDesktop && (
              <div className="bg-gray-50 border border-gray-200 rounded-t-lg">
                <div className="flex items-center justify-between px-6 py-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  <div className="flex-1 min-w-0">Employee</div>
                  <div className="flex-1 min-w-0 text-center">Start Date</div>
                  <div className="flex-1 min-w-0 text-center">End Date</div>
                  <div className="flex-1 min-w-0 text-center">Posting Date</div>
                  <div className="flex-1 min-w-0 text-center">Gross Pay</div>
                  <div className="w-24 text-center">Actions</div>
                </div>
              </div>
            )}
          </>
        )}
      />
    </div>
  )
}

const SalarySlipItem: React.FC<{
  item: SalarySlip
  index?: number
  doctype: string
  maskSalary: boolean
  onDownload: (e: React.MouseEvent, salarySlipName: string) => void
  onViewPDF: (salarySlipName: string, startDate?: string) => void
  isDownloading: boolean
}> = ({ item, maskSalary, onDownload, onViewPDF, isDownloading }) => {
  if (item.status.toLowerCase() !== "submitted") return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatToIndianDate = (dateString: string): string => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  return (
    <div
      key={item.name}
      className="flex justify-between items-center gap-3 bg-white p-4 mt-1 rounded-xl border hover:shadow-sm transition-shadow"
    >
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[var(--text-primary)] text-base font-semibold">{formatToIndianDate(item.start_date)}</h3>
        </div>
        <div className="text-sm text-[var(--secondary-color)] space-y-1">
          <p className="font-medium">
            Gross Pay:{" "}
            {maskSalary ? (
              <span className="blur-sm select-none">XXXXXXXXX</span>
            ) : (
              <span>{formatCurrency(item.gross_pay)}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3">
        <button
          onClick={(e) => onDownload(e, item.name)}
          disabled={isDownloading}
          className="flex items-center justify-center p-2 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          title="Download Salary Slip"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewPDF(item.name, item.start_date)}
          className="flex items-center justify-center p-2 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          title="View Salary Slip"
        >
          <FaRegEye className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

const SalarySlipItemDesktop: React.FC<{
  item: SalarySlip
  index?: number
  doctype: string
  maskSalary: boolean
  onDownload: (e: React.MouseEvent, salarySlipName: string) => void
  onViewPDF: (salarySlipName: string, startDate?: string) => void
  isDownloading: boolean
}> = ({ item, maskSalary, onDownload, onViewPDF, isDownloading }) => {
  if (item.status.toLowerCase() !== "submitted") return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatToIndianDate = (dateString: string): string => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  return (
    <div className="bg-white border-x border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between px-6 py-4 text-sm">
        {/* Employee */}
        <div className="flex-1 min-w-0 font-medium text-gray-900 truncate">
          {item.employee}
        </div>

        {/* Start Date */}
        <div className="flex-1 min-w-0 text-center text-gray-700">
          {formatToIndianDate(item.start_date)}
        </div>

        {/* End Date */}
        <div className="flex-1 min-w-0 text-center text-gray-700">
          <span className="font-medium">{formatToIndianDate(item.end_date)}</span>
        </div>

        {/* Posting Date */}
        <div className="flex-1 min-w-0 text-center text-gray-700">
          <span className="font-medium">{formatToIndianDate(item.posting_date)}</span>
        </div>

        {/* Gross Pay */}
        <div className="flex-1 min-w-0 text-center text-gray-700">
          {maskSalary ? (
            <span className="blur-sm select-none text-gray-400">₹XX,XXX</span>
          ) : (
            <span className="font-medium">{formatCurrency(item.gross_pay)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="w-24 flex items-center justify-center gap-2">
          <button
            onClick={(e) => onDownload(e, item.name)}
            disabled={isDownloading}
            className="flex items-center border justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download Salary Slip"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewPDF(item.name, item.start_date)}
            className="flex items-center justify-center border p-2 text-blue-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
            title="View Salary Slip"
          >
            <FaRegEye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default SalarySlipsList