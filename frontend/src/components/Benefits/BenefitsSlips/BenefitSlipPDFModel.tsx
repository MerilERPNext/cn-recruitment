"use client"

import type React from "react"
import html2pdf from "html2pdf.js"
import { Download, X, ZoomIn, ZoomOut } from "lucide-react"
import { useState } from "react"
import { BsToggleOff, BsToggleOn } from "react-icons/bs"

interface BenefitSlipPDFMOdelProps {
    isOpen: boolean
    onClose: () => void
    benefitSlipName: string
    benefitSlipDate?: string
    htmlContent?: string
    type?: string
}

const BenefitSlipPDFMOdel: React.FC<BenefitSlipPDFMOdelProps> = ({
    isOpen,
    onClose,
    benefitSlipName,
    benefitSlipDate,
    htmlContent,
}) => {
    const [isMasked, setIsMasked] = useState(true)
    const [zoom, setZoom] = useState(100)

    if (!isOpen) return null

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200))
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50))
    const handleZoomReset = () => setZoom(100)

    const handleDownload = () => {
        if (!htmlContent) return alert("No content to download")

        const container = document.createElement("div")
        container.innerHTML = htmlContent
        document.body.appendChild(container)

        html2pdf()
            .set({
                margin: 0,
                filename: `${benefitSlipName}.pdf`,
                html2canvas: { scale: 2 },
                jsPDF: { unit: "mm", format: "a4" },
            })
            .from(container)
            .save()
            .finally(() => document.body.removeChild(container))
    }

    // Inject CSS into iframe content
    const enhancedHtml = htmlContent
        ? `
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          background: white;
        }
        body > * {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box;
        }
        table {
          width: 100% !important;
          border-collapse: collapse;
        }
      </style>
      ${htmlContent}
    `
        : ""

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                <div className="min-w-0 flex-1 mr-3">
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                        {benefitSlipName}
                    </h3>
                    {benefitSlipDate && (
                        <p className="text-xs text-gray-500">{benefitSlipDate}</p>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Mask Toggle */}
                    <button
                        onClick={() => setIsMasked(!isMasked)}
                        className="p-2 rounded-lg hover:bg-gray-100"
                    >
                        {isMasked ? (
                            <BsToggleOff className="w-5 h-5 text-gray-400" />
                        ) : (
                            <BsToggleOn className="w-5 h-5 text-blue-600" />
                        )}
                    </button>

                    {/* Download */}
                    <button
                        onClick={handleDownload}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-center gap-2 px-4 py-2 border-b bg-gray-50 shrink-0">
                <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>

                <button
                    onClick={handleZoomReset}
                    className="px-3 py-1 text-xs font-semibold bg-white border rounded-lg"
                >
                    {zoom}%
                </button>

                <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div
                className={`flex-1 overflow-auto bg-gray-50 ${isMasked ? "filter blur-xl" : ""
                    }`}
                style={{
                    WebkitOverflowScrolling: "touch",
                    touchAction: "auto",
                }}
            >
                <div className="p-4 w-fit">
                    {/* 🔥 THIS DIV CONTROLS SCROLL SIZE */}
                    <div
                        style={{
                            width: `${(zoom / 100) * 210}mm`, // scaled width
                            height: `${(zoom / 100) * 297}mm`, // scaled height
                        }}
                    >
                        {/* 🔥 THIS DIV HANDLES VISUAL ZOOM */}
                        <div
                            style={{
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: "top left",
                                width: "210mm",
                                height: "297mm",
                            }}
                        >
                            <div className="bg-white shadow-md">
                                <iframe
                                    srcDoc={enhancedHtml}
                                    className="block border-0 pointer-events-none"
                                    style={{
                                        width: "210mm",
                                        height: "297mm",
                                        background: "white",
                                    }}
                                    sandbox="allow-same-origin allow-scripts"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BenefitSlipPDFMOdel