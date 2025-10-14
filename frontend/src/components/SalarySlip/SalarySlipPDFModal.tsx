"use client"

import type React from "react"

import html2pdf from "html2pdf.js"
import { Download, X } from "lucide-react"
import { useState } from "react"
import { BsToggleOff, BsToggleOn } from "react-icons/bs"

interface SalarySlipPDFModalProps {
  isOpen: boolean
  onClose: () => void
  salarySlipName: string
  salarySlipDate?: string
  htmlContent?: string
  type?: string // ✅ only string, optional
}

const SalarySlipPDFModal: React.FC<SalarySlipPDFModalProps> = ({
  isOpen,
  onClose,
  salarySlipName,
  salarySlipDate,
  htmlContent,
  type,
}) => {
  const [isMasked, setIsMasked] = useState(true)
  console.log("html console log gornskdnfksdnfkas fkasd aksd aksnksdnfaksda =======", type, { htmlContent })

  if (!isOpen) return null

  const handleDownload = () => {
    if (!htmlContent) return alert("No content to download")
    const container = document.createElement("div")
    container.innerHTML = htmlContent
    document.body.appendChild(container)
    html2pdf()
      .set({
        margin: 0,
        filename: `${salarySlipName}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4" },
      })
      .from(container)
      .save()
      .then(() => document.body.removeChild(container))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">{salarySlipName}</h3>
            {salarySlipDate && <p className="text-sm text-gray-500">{salarySlipDate}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMasked(!isMasked)}>
              {isMasked ? <BsToggleOff className="w-6 h-6" /> : <BsToggleOn className="w-6 h-6" />}
            </button>
            <button onClick={handleDownload} className="p-2 bg-blue-600 text-white rounded">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className={`flex-1 overflow-auto ${isMasked ? "filter blur-xl" : ""}`}>
          <iframe
            srcDoc={htmlContent || ""}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  )
}

export default SalarySlipPDFModal
