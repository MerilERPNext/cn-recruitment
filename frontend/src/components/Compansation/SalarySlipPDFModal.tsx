"use client"

import type React from "react"

import html2pdf from "html2pdf.js"
import { Download, X } from "lucide-react"
import { useState } from "react"
import { BsToggleOff, BsToggleOn } from "react-icons/bs"
import Button from "../shared/atoms/Button"
import { Typography } from "../shared/atoms/Typography"
import { useScreenSize } from "../../hooks/useScreenSize"

interface SalarySlipPDFModalProps {
  isOpen: boolean
  onClose: () => void
  salarySlipName: string
  salarySlipDate?: string
  htmlContent?: string
  type?: string
  pdfUrl?: string;  // ✅ only string, optional
}

const SalarySlipPDFModal: React.FC<SalarySlipPDFModalProps> = ({
  isOpen,
  onClose,
  salarySlipName,
  salarySlipDate,
  htmlContent,
  type,
  pdfUrl,
}) => {
  const [isMasked, setIsMasked] = useState(true)
  console.log("html console log gornskdnfksdnfkas fkasd aksd aksnksdnfaksda =======", type, { htmlContent }, pdfUrl)
  const { isDesktop } = useScreenSize();
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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center sm:p-4">
      <div className="bg-app sm:rounded-xl sm:shadow-xl w-full sm:max-w-5xl sm:h-[90vh] h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <Typography variant={isDesktop ? "h4" : "body"} >{salarySlipName}</Typography>
            {salarySlipDate && <p className="text-sm text-gray-500">{salarySlipDate}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              onClick={() => setIsMasked(!isMasked)}>
              {isMasked ? <BsToggleOff className="sm:w-6 sm:h-6 h-4 w-4" /> : <BsToggleOn className="sm:w-6 sm:h-6 h-4 w-4" />}
            </Button>
            <Button
              variant="soft"
              onClick={handleDownload}>
              <Download className="sm:w-6 sm:h-6 h-4 w-4" />
            </Button>
            <Button
              variant="soft"
              onClick={onClose}>
              <X className="sm:w-6 sm:h-6 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Content */}
        <div className={`flex-1 overflow-auto bg-app ${isMasked ? "filter blur-xl" : ""}`}>
          {pdfUrl ? (
            // ✅ PDF Preview
            <object
              data={`${pdfUrl}#toolbar=0`}
              type="application/pdf"

              className="w-full h-full border-0"
            >
              <p>
                PDF preview not supported.
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  Download PDF
                </a>
              </p>
            </object>
          ) : (
            // ✅ HTML Preview
            <iframe
              className="w-full h-full border-0"
              srcDoc={htmlContent || ""}
            />
          )}

        </div>
      </div>
    </div>
  )
}

export default SalarySlipPDFModal
